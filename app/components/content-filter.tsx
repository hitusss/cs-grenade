import { useNavigate, useRouteLoaderData, useSearchParams } from 'react-router'

import { grenadeLabels, grenadeTypes } from '#types/grenades-types.ts'
import { teamLabels, teams } from '#types/teams.ts'
import { useDebounce } from '#app/utils/misc.tsx'
import { type loader as rootLoader } from '#app/root.tsx'

import { Button } from './ui/button.tsx'
import { Card, CardContent } from './ui/card.tsx'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from './ui/collapsible.tsx'
import { Icon } from './ui/icon.tsx'
import { Input } from './ui/input.tsx'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from './ui/select.tsx'

type ContentFilterProps = {
	queryFilter?: boolean
	mapFilter?: boolean
	teamFilter?: boolean
	typeFilter?: boolean
	verifiedFilter?: boolean
}

export function ContentFilter({
	queryFilter,
	mapFilter,
	teamFilter,
	typeFilter,
	verifiedFilter,
}: ContentFilterProps) {
	const data = useRouteLoaderData<typeof rootLoader>('root')
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()

	const activeMaps = data?.maps.filter((m) => m.isActive) ?? []
	const inactiveMaps = data?.maps.filter((m) => !m.isActive) ?? []

	const query = searchParams.get('query') ?? ''
	const map = searchParams.get('map') ?? ''
	const team = searchParams.get('team') ?? ''
	const type = searchParams.get('type') ?? ''
	const verified = searchParams.get('verified') ?? ''

	const handleFilterChange = (key: string, value: string) => {
		setSearchParams((prev) => {
			prev.set(key, value)
			prev.delete('page')
			return prev
		})
		void navigate({ search: searchParams.toString() })
	}

	const handleFilterDelete = (key: string) => {
		setSearchParams((prev) => {
			prev.delete(key)
			prev.delete('page')
			return prev
		})
		void navigate({ search: searchParams.toString() })
	}

	const handleFIlterReset = () => {
		setSearchParams((prev) => {
			prev.delete('query')
			prev.delete('map')
			prev.delete('team')
			prev.delete('type')
			prev.delete('verified')
			prev.delete('page')
			return prev
		})
		void navigate({ search: searchParams.toString() })
	}

	const handleQueryChange = useDebounce((value: string) => {
		if (value === '') {
			return handleFilterDelete('query')
		}
		handleFilterChange('query', value)
	}, 400)

	return (
		<Collapsible className="group/collapsible">
			<CollapsibleTrigger asChild>
				<Button variant="outline" size="lg" className="w-full justify-between">
					Filters
					<Icon
						name="chevron-down"
						className="ml-auto transition-transform duration-200 group-data-[state=closed]/collapsible:rotate-90"
					/>
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent asChild>
				<Card className="mt-2">
					<CardContent className="flex flex-col gap-4 p-6">
						<search className="flex flex-wrap gap-4 *:w-full md:*:w-64">
							{queryFilter ? (
								<Input
									type="search"
									name="query"
									placeholder="Search"
									defaultValue={query}
									onChange={(e) => handleQueryChange(e.currentTarget.value)}
								/>
							) : null}
							{mapFilter ? (
								<Select
									value={map}
									onValueChange={(v) => handleFilterChange('map', v)}
								>
									<div className="flex">
										<SelectTrigger>
											<SelectValue placeholder="Map" />
										</SelectTrigger>
										<Button
											variant="ghost"
											size="icon"
											disabled={!map}
											onClick={() => handleFilterDelete('map')}
										>
											<Icon name="x" />
											<span className="sr-only">clean map</span>
										</Button>
									</div>
									<SelectContent>
										<SelectGroup>
											<SelectLabel>Active</SelectLabel>
											{activeMaps.map((m) => (
												<SelectItem key={m.label} value={m.name}>
													<div className="flex items-center gap-2 truncate text-sm">
														<img
															src={`/resources/map-logos/${m.logo?.id}`}
															alt=""
															className="size-4"
														/>
														{m.label}
													</div>
												</SelectItem>
											))}
										</SelectGroup>
										{inactiveMaps.length > 0 ? (
											<SelectGroup>
												<SelectLabel>Inactive</SelectLabel>
												{inactiveMaps.map((m) => (
													<SelectItem key={m.label} value={m.name}>
														<div className="flex items-center gap-2 truncate text-sm">
															<img
																src={`/resources/map-logos/${m.logo?.id}`}
																alt=""
																className="size-4"
															/>
															{m.label}
														</div>
													</SelectItem>
												))}
											</SelectGroup>
										) : null}
									</SelectContent>
								</Select>
							) : null}
							{teamFilter ? (
								<Select
									value={team}
									onValueChange={(v) => handleFilterChange('team', v)}
								>
									<div className="flex">
										<SelectTrigger>
											<SelectValue placeholder="Team" />
										</SelectTrigger>
										<Button
											variant="ghost"
											size="icon"
											disabled={!team}
											onClick={() => handleFilterDelete('team')}
										>
											<Icon name="x" />
											<span className="sr-only">clear team</span>
										</Button>
									</div>
									<SelectContent>
										{teams.map((t) => (
											<SelectItem key={t} value={t}>
												<div className="flex items-center gap-2 truncate">
													<img
														src={`/img/teams/${t}.png`}
														alt=""
														className="size-4"
													/>
													{teamLabels[t]}
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : null}
							{typeFilter ? (
								<Select
									value={type}
									onValueChange={(v) => handleFilterChange('type', v)}
								>
									<div className="flex">
										<SelectTrigger>
											<SelectValue placeholder="Grenade type" />
										</SelectTrigger>
										<Button
											variant="ghost"
											size="icon"
											disabled={!type}
											onClick={() => handleFilterDelete('type')}
										>
											<Icon name="x" />
											<span className="sr-only">clear grenade type</span>
										</Button>
									</div>
									<SelectContent>
										{grenadeTypes.map((g) => (
											<SelectItem key={g} value={g}>
												<div className="flex items-center gap-2 truncate">
													<img
														src={`/img/grenades/${g}.png`}
														alt=""
														className="size-4"
													/>
													{grenadeLabels[g]}
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : null}
							{verifiedFilter ? (
								<Select
									value={verified}
									onValueChange={(v) => handleFilterChange('verified', v)}
								>
									<div className="flex">
										<SelectTrigger>
											<SelectValue placeholder="Verified" />
										</SelectTrigger>
										<Button
											variant="ghost"
											size="icon"
											disabled={!verified}
											onClick={() => handleFilterDelete('verified')}
										>
											<Icon name="x" />
											<span className="sr-only">clear verified</span>
										</Button>
									</div>
									<SelectContent>
										<SelectItem value="true">Verified</SelectItem>
										<SelectItem value="false">Unverified</SelectItem>
									</SelectContent>
								</Select>
							) : null}
						</search>
						<Button
							variant="ghost"
							className="self-end"
							onClick={() => {
								handleFIlterReset()
							}}
						>
							Reset
						</Button>
					</CardContent>
				</Card>
			</CollapsibleContent>
		</Collapsible>
	)
}
