import {
	data,
	Link,
	redirect,
	useLoaderData,
	useNavigate,
	useSearchParams,
	useSubmit,
} from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { type Prisma } from '@prisma/client'
import { type ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'

import {
	addUserRole,
	getFilteredUserCount,
	getFilteredUsersWithPagginations,
	removeUserRole,
} from '#app/models/index.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useDebounce } from '#app/utils/misc.tsx'
import {
	requireUserWithPermission,
	requireUserWithRolePriority,
} from '#app/utils/permissions.server.ts'
import {
	userHasPermission,
	userHasRolePriority,
} from '#app/utils/permissions.ts'
import { getUserImgSrc, useUser } from '#app/utils/user.ts'
import { Badge } from '#app/components/ui/badge.js'
import { Button } from '#app/components/ui/button.tsx'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { SidebarTrigger } from '#app/components/ui/sidebar.tsx'
import {
	DataTable,
	DataTableColumnHeader,
	SortSchema,
} from '#app/components/data-table.tsx'
import { Pagination } from '#app/components/pagination.tsx'

import { type Route } from './+types/index.ts'

const ToggleRoleIntent = z.object({
	intent: z.literal('toggleRole'),
	userId: z.string(),
	role: z.string(),
	value: z.enum(['true', 'false']),
})

const UserActionSchema = z.discriminatedUnion('intent', [ToggleRoleIntent])

const columns: ColumnDef<{
	id: string
	name: string | null
	username: string
	email: string
	image: {
		id: string
	} | null
	roles: {
		name: string
	}[]
}>[] = [
	{
		accessorKey: 'avatar',
		header: '',
		cell: ({ row }) => (
			<img
				src={getUserImgSrc(row.original.image?.id)}
				className="size-8 rounded-full"
				alt={row.getValue('username')}
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
		enableHiding: true,
	},
	{
		accessorKey: 'username',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Username" />
		),
		enableSorting: true,
		enableHiding: false,
	},
	{
		accessorKey: 'email',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Email" />
		),
		enableSorting: true,
		enableHiding: true,
	},
	{
		accessorKey: 'roles',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Roles" />
		),
		cell: ({ row }) => (
			<div className="flex flex-wrap gap-1">
				{row.original.roles.map((role) => (
					<Badge key={role.name}>{role.name}</Badge>
				))}
			</div>
		),
		enableSorting: false,
		enableHiding: true,
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			// eslint-disable-next-line react-hooks/rules-of-hooks
			const loaderData = useLoaderData<typeof loader>()
			// eslint-disable-next-line react-hooks/rules-of-hooks
			const submit = useSubmit()
			// eslint-disable-next-line react-hooks/rules-of-hooks
			const user = useUser()
			const hasUpdateUserAnyPermission = userHasPermission(
				user,
				'update:user:any',
			)

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
								to={`/users/${row.original.username}`}
								className="flex items-center gap-2"
							>
								Go to profile
								<Icon name="arrow-right" />
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						{hasUpdateUserAnyPermission ? (
							<DropdownMenuGroup>
								<DropdownMenuLabel>Toggle Groups</DropdownMenuLabel>
								{loaderData.roles.map((role) => (
									<DropdownMenuCheckboxItem
										key={role.name}
										checked={row.original.roles.some(
											(r) => r.name === role.name,
										)}
										onCheckedChange={(value) => {
											const formData = new FormData()
											formData.append('intent', 'toggleRole')
											formData.append('userId', row.original.id)
											formData.append('role', role.name)
											formData.append('value', String(value))

											void submit(formData, { method: 'post' })
										}}
										className="capitalize"
										disabled={!userHasRolePriority(user, role.priority)}
									>
										{role.name}
									</DropdownMenuCheckboxItem>
								))}
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
	await requireUserWithPermission(request, 'read:user:any')
	const searchParams = new URL(request.url).searchParams
	const query = searchParams.get('query')
	if (query === '') {
		searchParams.delete('query')
		return redirect(`/admin/users?${searchParams.toString()}`)
	}
	const role = searchParams.get('role')
	if (role === '' || role?.toLowerCase() === 'any') {
		searchParams.delete('role')
		return redirect(`/admin/users?${searchParams.toString()}`)
	}

	const page = Number(searchParams.get('page') ?? 1)
	const perPage = Number(searchParams.get('perPage') ?? 25)

	const sort = searchParams.get('sort') ?? '[]'
	const sortResult = SortSchema.safeParse(JSON.parse(sort))
	if (!sortResult.success) {
		searchParams.delete('sort')
		return redirect(`/admin/users?${searchParams.toString()}`)
	}
	const orderBy: Record<string, Prisma.SortOrder> = {}
	sortResult.data.forEach((sort) => {
		orderBy[sort.id] = sort.desc ? 'desc' : 'asc'
	})

	const total = await getFilteredUserCount({ query, role })
	const users = await getFilteredUsersWithPagginations({
		query,
		role,
		orderBy,
		page,
		perPage,
	})

	const roles = await prisma.role.findMany({
		select: {
			name: true,
			priority: true,
		},
	})

	return data({ total, users, roles })
}

export async function action({ request }: Route.ActionArgs) {
	await requireUserWithPermission(request, 'update:user:any')

	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: UserActionSchema,
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
		case 'toggleRole': {
			const { userId, role, value } = submission.value
			const booleanValue = value === 'true'

			const roleWithPriority = await prisma.role.findUnique({
				where: {
					name: role,
				},
				select: {
					priority: true,
				},
			})

			invariantResponse(roleWithPriority, "Role doesn't exist")
			await requireUserWithRolePriority(request, roleWithPriority.priority)

			if (booleanValue) {
				await addUserRole({
					userId,
					role,
				})
			} else {
				await removeUserRole({
					userId,
					role,
				})
			}

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

export default function AdminUsersRoute({ loaderData }: Route.ComponentProps) {
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()

	const query = searchParams.get('query') ?? ''
	const role = searchParams.get('role') ?? ''

	const handleQueryChange = useDebounce((input: HTMLInputElement) => {
		setSearchParams((prev) => {
			prev.set('query', input.value)
			prev.delete('page')
			return prev
		})
		void navigate({ search: searchParams.toString() })
	}, 400)

	return (
		<>
			<div className="flex items-center gap-4">
				<SidebarTrigger />
				<h2>Users</h2>
			</div>
			<div className="flex flex-wrap gap-4">
				<div>
					<Label>Search</Label>
					<Input
						placeholder="Search..."
						type="search"
						name="query"
						defaultValue={query}
						onChange={(e) => handleQueryChange(e.currentTarget)}
					/>
				</div>
				<div>
					<Label>Role</Label>
					<div className="flex">
						<Select
							value={role}
							onValueChange={(value) => {
								setSearchParams((prev) => {
									prev.set('role', value)
									prev.delete('page')
									return prev
								})
								void navigate({ search: searchParams.toString() })
							}}
						>
							<SelectTrigger className="w-56">
								<SelectValue placeholder="Any" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Any">Any</SelectItem>
								{loaderData.roles.map((role) => (
									<SelectItem
										key={role.name}
										value={role.name}
										className="capitalize"
									>
										{role.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>
			<DataTable columns={columns} data={loaderData.users} />
			<Pagination total={loaderData.total} />
		</>
	)
}
