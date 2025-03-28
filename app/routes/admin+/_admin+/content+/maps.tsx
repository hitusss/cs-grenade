import { data, Link, redirect, useSubmit } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { type Prisma } from '@prisma/client'
import { type ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'

import { grenadeTypes } from '#types/grenades-types.ts'
import { teams } from '#types/teams.ts'
import {
	getMapCount,
	getMapsWithPagination,
	updateMapActiveState,
} from '#app/models/index.server.ts'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { userHasPermission } from '#app/utils/permissions.ts'
import {
	getUserDisplayName,
	getUserFullName,
	getUserImgSrc,
	useUser,
} from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { SidebarTrigger } from '#app/components/ui/sidebar.tsx'
import {
	DataTable,
	DataTableColumnHeader,
	SortSchema,
} from '#app/components/data-table.tsx'
import { Pagination } from '#app/components/pagination.tsx'

import { type Route } from './+types/maps.ts'

const ToggleActiveIntent = z.object({
	mapName: z.string(),
	isActive: z.enum(['true', 'false']),
	intent: z.literal('toggleActive'),
})

const MapSchema = z.discriminatedUnion('intent', [ToggleActiveIntent])

const columns: ColumnDef<{
	name: string
	label: string
	isActive: boolean
	logo: {
		id: string
	} | null
	user: {
		name: string | null
		image: {
			id: string
		} | null
		username: string
	} | null
}>[] = [
	{
		accessorKey: 'logo',
		header: '',
		cell: ({ row }) => (
			<img
				src={`/resources/map-logos/${row.original.logo?.id}`}
				className="size-8 rounded-full"
			/>
		),
		enableSorting: false,
		enableHiding: true,
	},
	{
		accessorKey: 'name',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Name" />
		),
		enableSorting: true,
		enableHiding: false,
	},
	{
		accessorKey: 'label',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Label" />
		),
		enableSorting: true,
		enableHiding: true,
	},
	{
		accessorKey: 'isActive',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Active" />
		),
		cell: ({ row }) => (
			<Icon name={row.original.isActive ? 'check' : 'x'} className="size-6" />
		),
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
					src={getUserImgSrc(row.original.user?.image?.id)}
					className="size-6 rounded-full"
					alt={getUserDisplayName(row.original.user)}
				/>
				{getUserFullName(row.original.user)}
			</div>
		),
		enableSorting: true,
		enableHiding: true,
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			// eslint-disable-next-line react-hooks/rules-of-hooks
			const submit = useSubmit()
			// eslint-disable-next-line react-hooks/rules-of-hooks
			const user = useUser()
			const hasUpdateMapPermission = userHasPermission(user, 'update:map')

			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<span className="sr-only">Open menu</span>
							<Icon name="ellipsis" className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link
								to={`/map/${row.original.name}/${teams[0]}/${grenadeTypes[0]}`}
								className="flex items-center gap-2"
							>
								Go to map
								<Icon name="arrow-right" />
							</Link>
						</DropdownMenuItem>
						{row.original.user ? (
							<DropdownMenuItem asChild>
								<Link
									to={`/users/${row.original.user.username}`}
									className="flex items-center gap-2"
								>
									Go to user profile
									<Icon name="arrow-right" />
								</Link>
							</DropdownMenuItem>
						) : null}
						{hasUpdateMapPermission ? (
							<DropdownMenuGroup>
								<DropdownMenuLabel>Menage</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Link
										to={`/map/${row.original.name}/edit`}
										className="flex items-center gap-2"
									>
										Edit map
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => {
										const formData = new FormData()
										formData.append('intent', 'toggleActive')
										formData.append('mapName', row.original.name)
										formData.append('isActive', String(row.original.isActive))
										void submit(formData, { method: 'post' })
									}}
								>
									Toggle Active
								</DropdownMenuItem>
							</DropdownMenuGroup>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			)
		},
		enableSorting: false,
		enableHiding: false,
	},
]

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithPermission(request, 'read:admin:any')

	const searchParams = new URL(request.url).searchParams

	const page = Number(searchParams.get('page') ?? 1)
	const perPage = Number(searchParams.get('perPage') ?? 25)

	const sort = searchParams.get('sort') ?? '[]'
	const sortResult = SortSchema.safeParse(JSON.parse(sort))
	if (!sortResult.success) {
		searchParams.delete('sort')
		return redirect(`/admin/content/maps?${searchParams.toString()}`)
	}
	const orderBy: Record<string, Prisma.SortOrder | Record<string, string>> = {}
	sortResult.data.forEach((sort) => {
		if (sort.id === 'user') {
			orderBy[sort.id] = {
				username: sort.desc ? 'desc' : 'asc',
			}
			return
		}
		orderBy[sort.id] = sort.desc ? 'desc' : 'asc'
	})

	const total = await getMapCount()
	const maps = await getMapsWithPagination({
		orderBy,
		page: page * perPage - perPage,
		perPage,
	})

	return data({ maps, total })
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: MapSchema,
		async: true,
	})
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{
				status: submission.status === 'error' ? 400 : 200,
			},
		)
	}

	switch (submission.value.intent) {
		case 'toggleActive': {
			await requireUserWithPermission(request, 'update:map')
			const isActive = submission.value.isActive === 'true'
			await updateMapActiveState({
				name: submission.value.mapName,
				isActive: !isActive,
			})
			return data({ result: submission.reply() })
		}
		default: {
			return data(
				{
					result: submission.reply({
						formErrors: ['Invalid intent'],
					}),
				},
				{
					status: 400,
				},
			)
		}
	}
}

export default function AdminContentMapsRoute({
	loaderData,
}: Route.ComponentProps) {
	return (
		<>
			<div className="flex items-center gap-4">
				<SidebarTrigger />
				<h2>Maps</h2>
			</div>
			<DataTable columns={columns} data={loaderData.maps} />
			<Pagination total={loaderData.total} />
		</>
	)
}
