import {
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	json,
	Link,
	useLoaderData,
	useNavigate,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { parseWithZod } from '@conform-to/zod'
import { type Prisma } from '@prisma/client'
import { type ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'

import { roles } from '#types/permissions.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useDebounce } from '#app/utils/misc.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { userHasRole } from '#app/utils/permissions.ts'
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
import {
	DataTable,
	DataTableColumnHeader,
	SortSchema,
} from '#app/components/data-table.tsx'
import { Pagination } from '#app/components/pagination.tsx'

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
			const submit = useSubmit()
			const user = useUser()
			const isSuperadmin = userHasRole(user, 'superadmin')

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
								to={`/users/${row.original.username}`}
								className="flex items-center gap-2"
							>
								Go to profile
								<Icon name="arrow-right" />
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuLabel>Toggle Groups</DropdownMenuLabel>
							{roles.map((role) => (
								<DropdownMenuCheckboxItem
									key={role}
									checked={row.original.roles.some((r) => r.name === role)}
									onCheckedChange={(value) => {
										const formData = new FormData()
										formData.append('intent', 'toggleRole')
										formData.append('userId', row.original.id)
										formData.append('role', role)
										formData.append('value', String(value))

										submit(formData, { method: 'post' })
									}}
									className="capitalize"
									disabled={role === 'superadmin' && !isSuperadmin}
								>
									{role}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			)
		},
		enableSorting: false,
		enableHiding: false,
	},
]

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, ['admin', 'superadmin'])
	const searchParams = new URL(request.url).searchParams
	const query = searchParams.get('query')
	if (query === '') {
		searchParams.delete('query')
		return redirect(`/admin/users?${searchParams.toString()}`)
	}
	const role = searchParams.get('role')
	if (role === '' || (role && roles.indexOf(role) === -1)) {
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

	const total = await prisma.user.count()
	const users = await prisma.user.findMany({
		where: {
			OR: query
				? [
						{
							email: {
								contains: query,
							},
						},
						{
							username: {
								contains: query,
							},
						},
						{
							name: {
								contains: query,
							},
						},
					]
				: undefined,
			roles: role ? { some: { name: role } } : undefined,
		},
		select: {
			id: true,
			email: true,
			username: true,
			name: true,
			image: {
				select: {
					id: true,
				},
			},
			roles: {
				select: {
					name: true,
				},
			},
		},
		orderBy,
		skip: page * perPage - perPage,
		take: perPage,
	})

	return json({ total, users })
}

export async function action({ request }: ActionFunctionArgs) {
	await requireUserWithRole(request, ['admin', 'superadmin'])

	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: UserActionSchema,
		async: true,
	})
	if (submission.status !== 'success') {
		return json(
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

			if (role === 'superadmin') {
				await requireUserWithRole(request, 'superadmin')
			}

			await prisma.user.update({
				where: { id: userId },
				data: {
					roles: {
						connect: booleanValue
							? {
									name: role,
								}
							: undefined,
						disconnect: booleanValue
							? undefined
							: {
									name: role,
								},
					},
				},
			})

			return json({ result: submission.reply() })
		}
		default: {
			return json(
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

export default function UsersRoute() {
	const data = useLoaderData<typeof loader>()
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
		navigate({ search: searchParams.toString() })
	}, 400)

	return (
		<>
			<h2>Users</h2>
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
								navigate({ search: searchParams.toString() })
							}}
						>
							<SelectTrigger className="w-56">
								<SelectValue placeholder="Any" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Any">Any</SelectItem>
								{roles.map((role) => (
									<SelectItem key={role} value={role} className="capitalize">
										{role}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>
			<DataTable columns={columns} data={data.users} />
			<Pagination total={data.total} />
		</>
	)
}
