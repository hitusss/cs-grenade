import { data, Form, Link, redirect } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { invariant } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { type Prisma } from '@prisma/client'
import { getExpandedRowModel, type ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'

import { grenadeLabels, isGrenadeType } from '#types/grenades-types.ts'
import { isTeamType, teamLabels } from '#types/teams.ts'
import {
	getFilteredDestinationWithReportsCount,
	getFiltereDestinationsWithReportsWithPagination,
} from '#app/models/index.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn } from '#app/utils/misc.tsx'
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
import { ReportsList } from '#app/components/report.tsx'

import { type Route } from './+types/destinations.ts'

const DeleteReport = z.object({
	reportId: z.string(),
	intent: z.literal('delete-report'),
})

const DeleteAllReports = z.object({
	destinationId: z.string(),
	intent: z.literal('delete-all-reports'),
})

const ReportsSchema = z.discriminatedUnion('intent', [
	DeleteReport,
	DeleteAllReports,
])

const columns: ColumnDef<{
	id: string
	name: string
	map: {
		name: string
		label: string
		logo: {
			id: string
		} | null
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
	reports: {
		id: string
		message: string
		user: {
			name: string | null
			username: string
			image: {
				id: string
			} | null
		} | null
	}[]
}>[] = [
	{
		id: 'expander',
		header: () => null,
		cell: ({ row }) => {
			return row.getCanExpand() ? (
				<button
					{...{
						onClick: row.getToggleExpandedHandler(),
						style: { cursor: 'pointer' },
					}}
				>
					<Icon
						name="chevron-down"
						className={cn('ml-auto transition-transform duration-200', {
							'-rotate-90': !row.getIsExpanded(),
						})}
					/>
				</button>
			) : null
		},
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
						<DropdownMenuSeparator />
						<Form method="post">
							<input
								type="hidden"
								name="destinationId"
								value={row.original.id}
							/>
							<Button
								type="submit"
								name="intent"
								value="delete-all-reports"
								variant="destructive"
							>
								<Icon name="trash" />
								Delete all reports
							</Button>
						</Form>
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

	const total = await getFilteredDestinationWithReportsCount({
		query,
		mapName: map,
		team,
		type,
		verified,
	})
	const destinations = await getFiltereDestinationsWithReportsWithPagination({
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

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: ReportsSchema,
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
		case 'delete-report': {
			await requireUserWithPermission(request, 'delete:report:any')
			await prisma.report.delete({
				where: {
					id: submission.value.reportId,
				},
			})
			return data({ result: submission.reply() })
		}
		case 'delete-all-reports': {
			await requireUserWithPermission(request, 'delete:report:any')
			await prisma.report.deleteMany({
				where: {
					destinationId: submission.value.destinationId,
				},
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

export default function AdminReportsDestinationsRoute({
	loaderData,
}: Route.ComponentProps) {
	return (
		<>
			<div className="flex items-center gap-4">
				<SidebarTrigger />
				<h2>Reports Destinations</h2>
			</div>
			<ContentFilter queryFilter mapFilter teamFilter typeFilter />
			<DataTable
				columns={columns}
				data={loaderData.destinations}
				tableOptions={{
					getRowCanExpand: () => true,
					getExpandedRowModel: getExpandedRowModel(),
				}}
				renderSubComponent={({ row }) => (
					<ReportsList reports={row.original.reports} />
				)}
			/>
			<Pagination total={loaderData.total} />
		</>
	)
}
