import { data, Link, redirect } from 'react-router'
import { invariant } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { type Prisma } from '@prisma/client'
import { type ColumnDef } from '@tanstack/react-table'

import { grenadeLabels, isGrenadeType } from '#types/grenades-types.ts'
import { isTeamType, teamLabels } from '#types/teams.ts'
import {
	getFilteredDestinationCount,
	getFiltereDestinationsWithPagination,
} from '#app/models/index.server.ts'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import {
	getUserDisplayName,
	getUserFullName,
	getUserImgSrc,
} from '#app/utils/user.ts'
import { Button } from '#app/components/ui/button.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { SidebarTrigger } from '#app/components/ui/sidebar.tsx'
import { ContentFilter } from '#app/components/content-filter.tsx'
import {
	DataTable,
	DataTableColumnHeader,
	SortSchema,
} from '#app/components/data-table.tsx'
import { Pagination } from '#app/components/pagination.tsx'

import { type Route } from './+types/destinations.ts'

const columns: ColumnDef<{
	id: string
	name: string
	map: {
		logo: {
			id: string
		} | null
		name: string
		label: string
	}
	team: string
	type: string
	verified: boolean
	user: {
		name: string | null
		image: {
			id: string
		} | null
		username: string
	} | null
}>[] = [
	{
		accessorKey: 'name',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Name" />
		),
		enableSorting: true,
		enableHiding: false,
	},
	{
		accessorKey: 'map',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Map" />
		),
		cell: ({ row }) => (
			<div className="flex items-center gap-2">
				<img
					src={`/resources/map-logos/${row.original.map.logo?.id}`}
					className="size-6 rounded-full"
				/>
				{row.original.map.label}
			</div>
		),
		enableSorting: true,
		enableHiding: true,
	},
	{
		accessorKey: 'team',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Team" />
		),
		cell: ({ row }) => (
			<div className="flex items-center gap-2">
				<img
					src={`/img/teams/${row.original.team}.png`}
					className="size-6 rounded-full"
				/>
				{teamLabels[row.original.team as keyof typeof teamLabels]}
			</div>
		),
		enableSorting: true,
		enableHiding: true,
	},
	{
		accessorKey: 'type',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Type" />
		),
		cell: ({ row }) => (
			<div className="flex items-center gap-2">
				<img
					src={`/img/grenades/${row.original.type}.png`}
					className="size-6 rounded-full"
				/>
				{grenadeLabels[row.original.type as keyof typeof grenadeLabels]}
			</div>
		),
		enableSorting: true,
		enableHiding: true,
	},

	{
		accessorKey: 'verified',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Verified" />
		),
		cell: ({ row }) => (
			<Icon name={row.original.verified ? 'check' : 'x'} className="size-6" />
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
								to={`/map/${row.original.map.name}/${row.original.team}/${row.original.type}/${row.original.id}`}
								className="flex items-center gap-2"
							>
								Go to destination
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

	const query = searchParams.get('query') ?? undefined
	const map = searchParams.get('map') ?? undefined
	const team = searchParams.get('team') ?? undefined
	const type = searchParams.get('type') ?? undefined
	const spVerified = searchParams.get('verified')
	const verified =
		spVerified === 'true' ? true : spVerified === 'false' ? false : undefined

	const page = Number(searchParams.get('page') ?? 1)
	const perPage = Number(searchParams.get('perPage') ?? 25)

	const sort = searchParams.get('sort') ?? '[]'
	const sortResult = SortSchema.safeParse(JSON.parse(sort))
	if (!sortResult.success) {
		searchParams.delete('sort')
		return redirect(`/admin/content/destinations?${searchParams.toString()}`)
	}
	const orderBy: Record<
		string,
		Prisma.SortOrder | Record<string, Prisma.SortOrder>
	> = {}
	sortResult.data.forEach((sort) => {
		switch (sort.id) {
			case 'map': {
				orderBy[sort.id] = {
					name: sort.desc ? 'desc' : 'asc',
				}
				break
			}
			case 'user': {
				orderBy[sort.id] = {
					name: sort.desc ? 'desc' : 'asc',
				}
				break
			}
			default: {
				orderBy[sort.id] = sort.desc ? 'desc' : 'asc'
			}
		}
	})

	invariant(team === undefined || isTeamType(team), 'Invalid team')
	invariant(type === undefined || isGrenadeType(type), 'Invalid grenade type')

	const total = await getFilteredDestinationCount({
		query,
		mapName: map,
		team,
		type,
		verified,
	})
	const destinations = await getFiltereDestinationsWithPagination({
		query,
		mapName: map,
		team,
		type,
		verified,
		orderBy,
		page,
		perPage,
	})

	return data({ destinations, total })
}

export default function AdminContentDestinationsRoute({
	loaderData,
}: Route.ComponentProps) {
	return (
		<>
			<div className="flex items-center gap-4">
				<SidebarTrigger />
				<h2>Destinations</h2>
			</div>
			<ContentFilter
				queryFilter
				mapFilter
				teamFilter
				typeFilter
				verifiedFilter
			/>
			<DataTable columns={columns} data={loaderData.destinations} />
			<Pagination total={loaderData.total} />
		</>
	)
}
