import {
	useNavigate,
	useRouteLoaderData,
	useSearchParams,
} from '@remix-run/react'

import { grenadeLabels, grenadeTypes } from '#types/grenades-types.ts'
import { teamLabels, teams } from '#types/teams.ts'
import { useDebounce } from '#app/utils/misc.tsx'
import { type loader as rootLoader } from '#app/root.tsx'

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from './ui/accordion.tsx'
import { Button } from './ui/button.tsx'
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
	hideFilter?: {
		query?: boolean
		map?: boolean
		team?: boolean
		type?: boolean
		verified?: boolean
	}
}

export function ContentFilter({ hideFilter }: ContentFilterProps) {
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
		navigate({ search: searchParams.toString() })
	}

	const handleFilterDelete = (key: string) => {
		setSearchParams((prev) => {
			prev.delete(key)
			prev.delete('page')
			return prev
		})
		navigate({ search: searchParams.toString() })
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
		navigate({ search: searchParams.toString() })
	}

	const handleQueryChange = useDebounce((value: string) => {
		if (value === '') {
			return handleFilterDelete('query')
		}
		handleFilterChange('query', value)
	}, 400)

	return (
		<Accordion type="single" collapsible>
			<AccordionItem value="filters">
				<AccordionTrigger>Filters</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-4 p-2">
					<div className="flex flex-wrap gap-4 [&>*]:w-full md:[&>*]:w-64">
						{hideFilter?.query ? null : (
							<Input
								type="search"
								name="query"
								placeholder="Search"
								defaultValue={query}
								onChange={(e) => handleQueryChange(e.currentTarget.value)}
							/>
						)}
						{hideFilter?.map ? null : (
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
												<div className="flex items-center gap-2 truncate text-body-xs">
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
													<div className="flex items-center gap-2 truncate text-body-xs">
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
						)}
						{hideFilter?.team ? null : (
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
						)}
						{hideFilter?.type ? null : (
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
						)}
						{hideFilter?.verified ? null : (
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
						)}
					</div>
					<Button
						variant="ghost"
						className="self-end"
						onClick={() => {
							handleFIlterReset()
						}}
					>
						Reset
					</Button>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	)
}
