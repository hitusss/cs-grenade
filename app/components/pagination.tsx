import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { range } from '#app/utils/misc.tsx'

import {
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
	Pagination as PaginationRoot,
} from './ui/pagination.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './ui/select.tsx'

function usePagination({
	totalCount,
	pageSize,
	siblingCount = 1,
	currentPage,
}: {
	totalCount: number
	pageSize: number
	siblingCount?: number
	currentPage: number
}) {
	const paginationRange = useMemo(() => {
		const totalPageCount = Math.ceil(totalCount / pageSize)

		// Pages count is determined as siblingCount + firstPage + lastPage + currentPage + 2*DOTS
		const totalPageNumbers = siblingCount + 5

		/*
      Case 1:
      If the number of pages is less than the page numbers we want to show in our
      paginationComponent, we return the range [1..totalPageCount]
    */
		if (totalPageNumbers >= totalPageCount) {
			return range(1, totalPageCount)
		}

		/*
    	Calculate left and right sibling index and make sure they are within range 1 and totalPageCount
    */
		const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
		const rightSiblingIndex = Math.min(
			currentPage + siblingCount,
			totalPageCount,
		)

		/*
      We do not show dots just when there is just one page number to be inserted between the extremes of sibling and the page limits i.e 1 and totalPageCount. Hence we are using leftSiblingIndex > 2 and rightSiblingIndex < totalPageCount - 2
    */
		const shouldShowLeftDots = leftSiblingIndex > 2
		const shouldShowRightDots = rightSiblingIndex < totalPageCount - 2

		const firstPageIndex = 1
		const lastPageIndex = totalPageCount

		/*
    	Case 2: No left dots to show, but rights dots to be shown
    */
		if (!shouldShowLeftDots && shouldShowRightDots) {
			let leftItemCount = 3 + 2 * siblingCount
			let leftRange = range(1, leftItemCount)

			return [...leftRange, '...', totalPageCount]
		}

		/*
    	Case 3: No right dots to show, but left dots to be shown
    */
		if (shouldShowLeftDots && !shouldShowRightDots) {
			let rightItemCount = 3 + 2 * siblingCount
			let rightRange = range(
				totalPageCount - rightItemCount + 1,
				totalPageCount,
			)
			return [firstPageIndex, '...', ...rightRange]
		}

		/*
    	Case 4: Both left and right dots to be shown
    */
		if (shouldShowLeftDots && shouldShowRightDots) {
			let middleRange = range(leftSiblingIndex, rightSiblingIndex)
			return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex]
		}
	}, [totalCount, pageSize, siblingCount, currentPage])

	return paginationRange
}

export function Pagination({
	total,
	siblingCount = 1,
}: {
	total: number
	siblingCount?: number
}) {
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()

	const page = Number(searchParams.get('page') ?? 1)
	const perPage = Number(searchParams.get('perPage') ?? 25)

	const paginationRage = usePagination({
		totalCount: total,
		pageSize: perPage,
		currentPage: page,
		siblingCount,
	})

	return (
		<div className="flex flex-wrap items-center justify-end gap-8">
			<Select
				value={String(perPage)}
				onValueChange={(value) => {
					setSearchParams((prev) => {
						prev.set('perPage', value)
						prev.delete('page')
						return prev
					})
					void navigate({ search: searchParams.toString() })
				}}
			>
				<SelectTrigger className="w-24">
					<SelectValue placeholder="Page size" />
				</SelectTrigger>
				<SelectContent side="top">
					{[25, 50, 75, 100].map((pageSize) => (
						<SelectItem key={pageSize} value={`${pageSize}`}>
							{pageSize}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<PaginationRoot className="mx-0 w-auto">
				<PaginationContent className="flex-wrap">
					<PaginationItem>
						<PaginationPrevious
							disabled={page === 1}
							onClick={() => {
								setSearchParams((prev) => {
									prev.set('page', String(page - 1))
									return prev
								})
								void navigate({ search: searchParams.toString() })
							}}
						/>
					</PaginationItem>
					{paginationRage?.map((p, i) =>
						typeof p === 'string' ? (
							<PaginationItem key={i}>
								<PaginationEllipsis />
							</PaginationItem>
						) : (
							<PaginationItem key={i}>
								<PaginationLink
									onClick={() => {
										setSearchParams((prev) => {
											prev.set('page', String(p))
											return prev
										})
										void navigate({ search: searchParams.toString() })
									}}
									isActive={p === page}
								>
									{p}
								</PaginationLink>
							</PaginationItem>
						),
					)}
					<PaginationItem>
						<PaginationNext
							disabled={page === paginationRage?.at(-1)}
							onClick={() => {
								setSearchParams((prev) => {
									prev.set('page', String(page + 1))
									return prev
								})
								void navigate({ search: searchParams.toString() })
							}}
						/>
					</PaginationItem>
				</PaginationContent>
			</PaginationRoot>
		</div>
	)
}
