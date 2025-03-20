import {
	data,
	Link,
	redirect,
	useNavigate,
	useSearchParams,
} from 'react-router'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { type ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'

import { getAdminTickets, getTicketCount } from '#app/models/index.server.ts'
import { useDebounce } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { getUserImgSrc } from '#app/utils/user.ts'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { SidebarTrigger } from '#app/components/ui/sidebar.tsx'
import {
	DataTable,
	DataTableColumnHeader,
	SortSchema,
} from '#app/components/data-table.tsx'
import { Pagination } from '#app/components/pagination.tsx'

import { type Route } from './+types/index.ts'

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
					<span className="bg-destructive block size-4 animate-pulse rounded-full" />
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

export async function loader({ request }: Route.LoaderArgs) {
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

	const total = await getTicketCount()
	const tickets = await getAdminTickets({
		orderBy,
		query,
		page,
		perPage,
	})
	const ticketsResult = TicketResultSchema.safeParse(tickets)
	if (!ticketsResult.success) {
		throw new Error(ticketsResult.error.message)
	}

	return data({ tickets: ticketsResult.data, total })
}

export default function AdminSupportRoute({
	loaderData,
}: Route.ComponentProps) {
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
		void navigate({ search: searchParams.toString() })
	}, 400)

	return (
		<>
			<div className="flex items-center gap-4">
				<SidebarTrigger />
				<h2>Support</h2>
			</div>
			<Input
				type="search"
				name="query"
				placeholder="Search..."
				defaultValue={query}
				onChange={(e) => handleQueryChange(e.target.value)}
				className="max-w-64"
			/>
			<DataTable columns={columns} data={loaderData.tickets} />
			<Pagination total={loaderData.total} />
		</>
	)
}
