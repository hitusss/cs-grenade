import { data, Form, Link, redirect } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { type Prisma } from '@prisma/client'
import { getExpandedRowModel, type ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'

import { grenadeLabels } from '#types/grenades-types.ts'
import { teamLabels } from '#types/teams.ts'
import {
	deleteAllGrenadeReports,
	deleteReport,
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

import { type Route } from './+types/grenades.ts'

const DeleteReport = z.object({
	reportId: z.string(),
	intent: z.literal('delete-report'),
})

const DeleteAllReports = z.object({
	grenadeId: z.string(),
	intent: z.literal('delete-all-reports'),
})

const ReportsSchema = z.discriminatedUnion('intent', [
	DeleteReport,
	DeleteAllReports,
])

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
								to={`/map/${row.original.map.name}/${row.original.team}/${row.original.type}/${row.original.destination.id}/${row.original.id}`}
								className="flex items-center gap-2"
							>
								Go to grenade
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
							<input type="hidden" name="grenadeId" value={row.original.id} />
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
		return redirect(`/admin/content/grenades?${searchParams.toString()}`)
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
			reports: {
				some: {
					id: {
						not: undefined,
					},
				},
			},
			name: {
				contains: query,
			},
			map: map ? { name: map } : undefined,
			team,
			type,
			verified,
		},
	})
	const grenades = await prisma.grenade.findMany({
		where: {
			reports: {
				some: {
					id: {
						not: undefined,
					},
				},
			},
			name: {
				contains: query,
			},
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
			reports: {
				select: {
					id: true,
					message: true,
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
			},
		},
		orderBy,
		skip: page * perPage - perPage,
		take: perPage,
	})

	return data({ grenades, total })
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
			await deleteReport(submission.value.reportId)
			return data({ result: submission.reply() })
		}
		case 'delete-all-reports': {
			await requireUserWithPermission(request, 'delete:report:any')
			await deleteAllGrenadeReports(submission.value.grenadeId)
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

export default function AdminReportsGrenadesRoute({
	loaderData,
}: Route.ComponentProps) {
	return (
		<>
			<div className="flex items-center gap-4">
				<SidebarTrigger />
				<h2>Reports Grenades</h2>
			</div>
			<ContentFilter queryFilter mapFilter teamFilter typeFilter />
			<DataTable
				columns={columns}
				data={loaderData.grenades}
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
