import { useReducer } from 'react'
import { useRouteLoaderData } from '@remix-run/react'

import { type loader as rootLoader } from '#app/root.tsx'

import { grenadeLabels, grenadeTypes } from '#types/grenades-types.ts'
import { teamLabels, teams } from '#types/teams.ts'

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from './ui/accordion.tsx'
import { Button } from './ui/button.tsx'
import { Icon } from './ui/icon.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './ui/select.tsx'

type FilterState = {
	map?: string
	team?: string
	grenade?: string
	verified?: string
}

type FilterSetMap = {
	type: 'SET_MAP'
	payload: FilterState['map']
}
type FilterSetTeam = {
	type: 'SET_TEAM'
	payload: FilterState['team']
}
type FilterSetGrenade = {
	type: 'SET_GRENADE'
	payload: FilterState['grenade']
}
type FilterSetVerified = {
	type: 'SET_VERIFIED'
	payload: FilterState['verified']
}
type FilterReset = {
	type: 'RESET'
}

type FilterAction =
	| FilterSetMap
	| FilterSetTeam
	| FilterSetGrenade
	| FilterSetVerified
	| FilterReset

const initialFilterState: FilterState = {
	map: undefined,
	team: undefined,
	grenade: undefined,
	verified: undefined,
}

function filterReducer(state: FilterState, action: FilterAction) {
	switch (action.type) {
		case 'SET_MAP': {
			return {
				...state,
				map: action.payload,
			}
		}
		case 'SET_TEAM': {
			return {
				...state,
				team: action.payload,
			}
		}
		case 'SET_GRENADE': {
			return {
				...state,
				grenade: action.payload,
			}
		}
		case 'SET_VERIFIED': {
			return {
				...state,
				verified: action.payload,
			}
		}
		case 'RESET': {
			return initialFilterState
		}
		default: {
			throw new Error(`Unhandled action`)
		}
	}
}

export function useContentFiler() {
	const [state, dispatch] = useReducer(filterReducer, initialFilterState)
	return { state, dispatch }
}

type ContentFilterProps = ReturnType<typeof useContentFiler> & {
	hideFilter?: {
		map?: boolean
		team?: boolean
		grenade?: boolean
		verified?: boolean
	}
}

export function ContentFilter({
	state,
	dispatch,
	hideFilter,
}: ContentFilterProps) {
	const data = useRouteLoaderData<typeof rootLoader>('root')
	return (
		<Accordion type="single" collapsible>
			<AccordionItem value="filters">
				<AccordionTrigger>Filters</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-4 p-2">
					<div className="flex flex-wrap gap-4 [&>*]:w-full md:[&>*]:w-64">
						{hideFilter?.map ? null : (
							<Select
								value={state.map ?? ''}
								onValueChange={(v) =>
									dispatch({
										type: 'SET_MAP',
										payload: v,
									})
								}
							>
								<div className="flex">
									<SelectTrigger>
										<SelectValue placeholder="Map" />
									</SelectTrigger>
									<Button
										variant="ghost"
										size="icon"
										disabled={!state.map}
										onClick={() =>
											dispatch({ type: 'SET_MAP', payload: undefined })
										}
									>
										<Icon name="x" />
										<span className="sr-only">clean map</span>
									</Button>
								</div>
								<SelectContent>
									{data?.maps.map((m) => (
										<SelectItem key={m.label} value={m.label}>
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
								</SelectContent>
							</Select>
						)}
						{hideFilter?.team ? null : (
							<Select
								value={state.team ?? ''}
								onValueChange={(v) =>
									dispatch({
										type: 'SET_TEAM',
										payload: v,
									})
								}
							>
								<div className="flex">
									<SelectTrigger>
										<SelectValue placeholder="Team" />
									</SelectTrigger>
									<Button
										variant="ghost"
										size="icon"
										disabled={!state.team}
										onClick={() =>
											dispatch({ type: 'SET_TEAM', payload: undefined })
										}
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
						{hideFilter?.grenade ? null : (
							<Select
								value={state.grenade ?? ''}
								onValueChange={(v) =>
									dispatch({
										type: 'SET_GRENADE',
										payload: v,
									})
								}
							>
								<div className="flex">
									<SelectTrigger>
										<SelectValue placeholder="Grenade" />
									</SelectTrigger>
									<Button
										variant="ghost"
										size="icon"
										disabled={!state.grenade}
										onClick={() =>
											dispatch({ type: 'SET_GRENADE', payload: undefined })
										}
									>
										<Icon name="x" />
										<span className="sr-only">clear grenade</span>
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
								value={state.verified ?? ''}
								onValueChange={(v) =>
									dispatch({
										type: 'SET_VERIFIED',
										payload: v,
									})
								}
							>
								<div className="flex">
									<SelectTrigger>
										<SelectValue placeholder="Verified" />
									</SelectTrigger>
									<Button
										variant="ghost"
										size="icon"
										disabled={!state.verified}
										onClick={() =>
											dispatch({ type: 'SET_VERIFIED', payload: undefined })
										}
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
							dispatch({ type: 'RESET' })
						}}
					>
						Reset
					</Button>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	)
}
