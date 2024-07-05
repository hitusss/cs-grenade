import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { type Prisma } from '@prisma/client'
import { type ColumnDef } from '@tanstack/react-table'

import { grenadeLabels } from '#types/grenades-types.ts'
import { teamLabels } from '#types/teams.ts'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { getUserImgSrc } from '#app/utils/user.ts'
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
import { ContentFilter } from '#app/components/content-filter.tsx'
import {
	DataTable,
	DataTableColumnHeader,
	SortSchema,
} from '#app/components/data-table.tsx'
import { Pagination } from '#app/components/pagination.tsx'

const columns: ColumnDef<{
	name: string
	map: {
		name: string
		logo: {
			id: string
		} | null
		label: string
	}
	id: string
	team: string
	type: string
	verified: boolean
	destination: {
		name: string
		id: string
	}
	user: {
		name: string | null
		image: {
			id: string
		} | null
		username: string
	}
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
		accessorKey: 'destination',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Destination" />
		),
		cell: ({ row }) => row.original.destination.name,
		enableSorting: true,
		enableHiding: true,
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
					src={getUserImgSrc(row.original.user.image?.id)}
					className="size-6 rounded-full"
					alt={row.original.user.username}
				/>
				{row.original.user.name
					? `${row.original.user.name} (${row.original.user.username})`
					: row.original.user.username}
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
						<DropdownMenuItem>
							<Link
								to={`/map/${row.original.map.name}/${row.original.team}/${row.original.type}/${row.original.destination.id}/${row.original.id}`}
								className="flex items-center gap-2"
							>
								Go to grenade
								<Icon name="arrow-right" />
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem>
							<Link
								to={`/users/${row.original.user.username}`}
								className="flex items-center gap-2"
							>
								Go to user profile
								<Icon name="arrow-right" />
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)
		},
		enableSorting: false,
		enableHiding: false,
	},
]

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, ['moderator', 'admin', 'superadmin'])

	const searchParams = new URL(request.url).searchParams

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
		return redirect(`/admin/users?${searchParams.toString()}`)
	}
	const orderBy: Record<
		string,
		Prisma.SortOrder | Record<string, Prisma.SortOrder>
	> = {}
	sortResult.data.forEach((sort) => {
		switch (sort.id) {
			case 'destination': {
				orderBy[sort.id] = {
					name: sort.desc ? 'desc' : 'asc',
				}
				break
			}
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

	const total = await prisma.grenade.count({
		where: {
			map: map ? { name: map } : undefined,
			team,
			type,
			verified,
		},
	})
	const grenades = await prisma.grenade.findMany({
		where: {
			map: map ? { name: map } : undefined,
			team,
			type,
			verified,
		},
		select: {
			id: true,
			name: true,
			destination: {
				select: {
					id: true,
					name: true,
				},
			},
			map: {
				select: {
					name: true,
					label: true,
					logo: {
						select: {
							id: true,
						},
					},
				},
			},
			team: true,
			type: true,
			verified: true,
			user: {
				select: {
					name: true,
					username: true,
					image: {
						select: {
							id: true,
						},
					},
				},
			},
		},
		orderBy,
		skip: page * perPage - perPage,
		take: perPage,
	})

	return json({ grenades, total })
}
export default function GrenadesAdminRoute() {
	const data = useLoaderData<typeof loader>()

	return (
		<>
			<h1>Grenades</h1>
			<ContentFilter />
			<DataTable columns={columns} data={data.grenades} />
			<Pagination total={data.total} />
		</>
	)
}
