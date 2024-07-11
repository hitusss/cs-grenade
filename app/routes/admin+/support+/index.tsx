import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node'
import {
	Link,
	useLoaderData,
	useNavigate,
	useSearchParams,
} from '@remix-run/react'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { type ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'

import { prisma } from '#app/utils/db.server.ts'
import { useDebounce } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { getUserImgSrc } from '#app/utils/user.ts'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import {
	DataTable,
	DataTableColumnHeader,
	SortSchema,
} from '#app/components/data-table.tsx'
import { Pagination } from '#app/components/pagination.tsx'

const TicketResultSchema = z
	.array(
		z.object({
			id: z.string(),
			title: z.string(),
			open: z.boolean(),
			createdAt: z.date().or(z.string()),
			updatedAt: z.date().or(z.string()),
			messages: z.bigint(),
			username: z.string(),
			name: z.string().nullable(),
			userImageId: z.string().nullable(),
		}),
	)
	.transform((data) =>
		data.map((t) => ({ ...t, messages: Number(t.messages) })),
	)
type TickerResultType = z.infer<typeof TicketResultSchema>

const columns: ColumnDef<TickerResultType[number]>[] = [
	{
		accessorKey: 'messages',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Unread" />
		),
		cell: ({ row }) =>
			row.original.messages > 0 ? (
				<div className="flex items-center gap-2">
					<span className="block size-4 animate-pulse rounded-full bg-destructive" />
					{row.original.messages}
				</div>
			) : null,
		enableSorting: true,
		enableHiding: false,
	},
	{
		accessorKey: 'title',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Title" />
		),
		enableSorting: true,
		enableHiding: false,
	},
	{
		accessorKey: 'status',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Status" />
		),
		cell: ({ row }) => (row.original.open ? 'Open' : 'Closed'),
		enableSorting: true,
		enableHiding: true,
	},
	{
		accessorKey: 'user',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="User" />
		),
		cell: ({ row }) => (
			<div className="flex items-center gap-2">
				<img
					src={getUserImgSrc(row.original.userImageId)}
					className="size-6 rounded-full"
					alt={row.original.username}
				/>
				{row.original.name
					? `${row.original.name} (${row.original.username})`
					: row.original.username}
			</div>
		),
		enableSorting: true,
		enableHiding: true,
	},
	{
		accessorKey: 'createdAt',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Created at" />
		),
		cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
		enableSorting: true,
		enableHiding: true,
	},
	{
		accessorKey: 'updatedAt',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Updated at" />
		),
		cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString(),
		enableSorting: true,
		enableHiding: true,
	},
	{
		id: 'actions',
		cell: ({ row }) => (
			<Link to={row.original.id}>
				Go to ticket <Icon name="arrow-right" className="h-4 w-4" />
			</Link>
		),
		enableSorting: false,
		enableHiding: false,
	},
]

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithPermission(request, 'read:support:any')

	const searchParams = new URL(request.url).searchParams

	const query = searchParams.get('query') ?? ''

	const page = Number(searchParams.get('page') ?? 1)
	const perPage = Number(searchParams.get('perPage') ?? 25)

	const sort = searchParams.get('sort') ?? '[]'
	const sortResult = SortSchema.safeParse(JSON.parse(sort))
	if (!sortResult.success) {
		searchParams.delete('sort')
		return redirect(`/admin/support?${searchParams.toString()}`)
	}
	const orderBy: string[] = []
	sortResult.data.forEach((sort) => {
		switch (sort.id) {
			case 'messages': {
				orderBy.push(`messages ${sort.desc ? 'DESC' : 'ASC'}`)
				break
			}
			case 'title': {
				orderBy.push(`title ${sort.desc ? 'DESC' : 'ASC'}`)
				break
			}
			case 'status': {
				orderBy.push(`open ${sort.desc ? 'DESC' : 'ASC'}`)
				break
			}
			case 'user': {
				orderBy.push(`username ${sort.desc ? 'DESC' : 'ASC'}`)
				break
			}
			case 'createdAt': {
				orderBy.push(`Ticket.createdAt ${sort.desc ? 'DESC' : 'ASC'}`)
				break
			}
			case 'updatedAt': {
				orderBy.push(`Ticket.updatedAt ${sort.desc ? 'DESC' : 'ASC'}`)
				break
			}
			default: {
				throw new Error(`Invalid sort id: ${sort.id}`)
			}
		}
	})

	const total = await prisma.ticket.count()
	const tickets = await prisma.$queryRawUnsafe(
		`
			SELECT
				Ticket.id,
				Ticket.title,
				Ticket.open,
				Ticket.updatedAt,
				Ticket.createdAt,
				User.name,
				User.username,
				UserImage.id AS userImageId,
				(
					SELECT COUNT(*)
					FROM TicketMessage
					WHERE TicketMessage.ticketId = Ticket.id
					AND TicketMessage.isAdmin = false
					AND TicketMessage.seen = false
				) AS messages
			FROM Ticket
			LEFT JOIN User ON Ticket.userId = User.id
			LEFT JOIN UserImage ON User.id = UserImage.userId
			${orderBy.length > 0 ? `ORDER BY ${orderBy.join(', ')}` : ''}
			WHERE Ticket.title LIKE $1
			LIMIT $2
			OFFSET $3;
		`,
		`%${query}%`,
		perPage,
		page * perPage - perPage,
	)
	const ticketsResult = TicketResultSchema.safeParse(tickets)
	if (!ticketsResult.success) {
		throw new Error(ticketsResult.error.message)
	}

	return json({ tickets: ticketsResult.data, total })
}

export default function SupportAdminRoute() {
	const data = useLoaderData<typeof loader>()
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()

	const query = searchParams.get('query') ?? ''

	const handleQueryChange = useDebounce((value: string) => {
		setSearchParams((prev) => {
			if (value === '') {
				prev.delete('query')
			} else {
				prev.set('query', value)
			}
			prev.delete('page')
			return prev
		})
		navigate({ search: searchParams.toString() })
	}, 400)

	return (
		<>
			<h1>Support</h1>
			<Input
				type="search"
				name="query"
				placeholder="Search..."
				defaultValue={query}
				onChange={(e) => handleQueryChange(e.target.value)}
				className="max-w-64"
			/>
			<DataTable columns={columns} data={data.tickets} />
			<Pagination total={data.total} />
		</>
	)
}
