import { Fragment, useState } from 'react'
import { useNavigate, useSearchParams } from '@remix-run/react'
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
	type Column,
	type ColumnDef,
	type Row,
	type SortingState,
	type TableOptions,
	type Table as TableType,
	type VisibilityState,
} from '@tanstack/react-table'
import { z } from 'zod'

import { cn } from '#app/utils/misc.tsx'

import { Button } from './ui/button.tsx'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx'
import { Icon } from './ui/icon.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from './ui/table.tsx'

export const SortSchema = z.array(
	z.object({ id: z.string(), desc: z.boolean() }),
)

export function DataTable<TData, TValue>({
	columns,
	data,
	tableOptions,
	renderSubComponent,
}: {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	tableOptions?: TableOptions<TData>
	renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement
}) {
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()

	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
	const [sorting, setSorting] = useState<SortingState>(() => {
		const sort = searchParams.get('sort') ?? '[]'
		const sortResult = SortSchema.safeParse(JSON.parse(sort))
		if (sortResult.success) {
			return sortResult.data
		} else {
			return []
		}
	})

	const defaultTableOptions: TableOptions<TData> = {
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onSortingChange: (update) => {
			const newSorting = typeof update === 'function' ? update(sorting) : update
			setSorting(newSorting)
			setSearchParams((prev) => {
				prev.set('sort', JSON.stringify(newSorting))
				prev.delete('page')
				return prev
			})
			navigate({ search: searchParams.toString() })
		},
		manualSorting: true,
		state: {
			columnVisibility,
			sorting,
		},
	}

	const table = useReactTable({
		...defaultTableOptions,
		...tableOptions,
		state: {
			...defaultTableOptions.state,
			...tableOptions?.state,
		},
	})

	return (
		<div className="flex flex-col overflow-hidden">
			<div className="flex items-center py-4">
				<DataTableViewOptions table={table} />
			</div>
			<div className="flex flex-col overflow-hidden rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody className="overflow-y-auto">
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<Fragment key={row.id}>
									<TableRow data-state={row.getIsSelected() && 'selected'}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
									{renderSubComponent !== undefined && row.getIsExpanded() ? (
										<tr>
											<td colSpan={row.getVisibleCells().length}>
												{renderSubComponent({ row })}
											</td>
										</tr>
									) : null}
								</Fragment>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}

export function DataTableViewOptions<TData>({
	table,
}: {
	table: TableType<TData>
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="ml-auto h-8">
					<Icon name="settings-2" className="mr-2 h-4 w-4" />
					View
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[150px]">
				<DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{table
					.getAllColumns()
					.filter(
						(column) =>
							typeof column.accessorFn !== 'undefined' && column.getCanHide(),
					)
					.map((column) => {
						return (
							<DropdownMenuCheckboxItem
								key={column.id}
								className="capitalize"
								checked={column.getIsVisible()}
								onCheckedChange={(value) => column.toggleVisibility(!!value)}
							>
								{column.id}
							</DropdownMenuCheckboxItem>
						)
					})}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

export function DataTableColumnHeader<TData, TValue>({
	column,
	title,
	className,
}: {
	column: Column<TData, TValue>
	title: string
} & React.HTMLAttributes<HTMLDivElement>) {
	if (!column.getCanSort()) {
		return <div className={cn(className)}>{title}</div>
	}

	return (
		<div className={cn('flex items-center space-x-2', className)}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="-ml-3 h-8 data-[state=open]:bg-accent"
					>
						<span>{title}</span>
						{column.getIsSorted() === 'desc' ? (
							<Icon name="arrow-down" className="ml-2 h-4 w-4" />
						) : column.getIsSorted() === 'asc' ? (
							<Icon name="arrow-up" className="ml-2 h-4 w-4" />
						) : (
							<Icon name="arrow-down-up" className="ml-2 h-4 w-4" />
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem onClick={() => column.toggleSorting(false)}>
						<Icon
							name="arrow-up"
							className="mr-2 h-3.5 w-3.5 text-muted-foreground/70"
						/>
						Asc
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => column.toggleSorting(true)}>
						<Icon
							name="arrow-down"
							className="mr-2 h-3.5 w-3.5 text-muted-foreground/70"
						/>
						Desc
					</DropdownMenuItem>
					{column.getCanHide() ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
								<Icon
									name="eye-off"
									className="mr-2 h-3.5 w-3.5 text-muted-foreground/70"
								/>
								Hide
							</DropdownMenuItem>
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
