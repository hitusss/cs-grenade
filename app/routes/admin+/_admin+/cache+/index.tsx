import { useState } from 'react'
import {
	data,
	Form,
	Link,
	redirect,
	useFetcher,
	useSearchParams,
	useSubmit,
} from 'react-router'
import { invariantResponse } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'

import {
	cache,
	getAllCacheKeys,
	lruCache,
	searchCacheKeys,
} from '#app/utils/cache.server.ts'
import {
	ensureInstance,
	getAllInstances,
	getInstanceInfo,
} from '#app/utils/litefs.server.ts'
import { useDebounce, useDoubleCheck } from '#app/utils/misc.tsx'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { Button } from '#app/components/ui/button.tsx'
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

import { type Route } from './+types/index.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithPermission(request, 'read:cache:any')
	const searchParams = new URL(request.url).searchParams
	const query = searchParams.get('query')
	if (query === '') {
		searchParams.delete('query')
		return redirect(`/admin/cache?${searchParams.toString()}`)
	}
	const limit = Number(searchParams.get('limit') ?? 100)

	const currentInstanceInfo = await getInstanceInfo()
	const instance =
		searchParams.get('instance') ?? currentInstanceInfo.currentInstance
	const instances = await getAllInstances()
	await ensureInstance(instance)

	let cacheKeys: { sqlite: Array<string>; lru: Array<string> }
	if (typeof query === 'string') {
		cacheKeys = await searchCacheKeys(query, limit)
	} else {
		cacheKeys = await getAllCacheKeys(limit)
	}
	return data({ cacheKeys, instance, instances, currentInstanceInfo })
}

export async function action({ request }: Route.ActionArgs) {
	await requireUserWithPermission(request, 'delete:cache:any')
	const formData = await request.formData()
	const key = formData.get('cacheKey')
	const { currentInstance } = await getInstanceInfo()
	const instance = formData.get('instance') ?? currentInstance
	const type = formData.get('type')

	invariantResponse(typeof key === 'string', 'cacheKey must be a string')
	invariantResponse(typeof type === 'string', 'type must be a string')
	invariantResponse(typeof instance === 'string', 'instance must be a string')
	await ensureInstance(instance)

	switch (type) {
		case 'sqlite': {
			await cache.delete(key)
			break
		}
		case 'lru': {
			lruCache.delete(key)
			break
		}
		default: {
			throw new Error(`Unknown cache type: ${type}`)
		}
	}
	return data({ success: true })
}

export default function AdminCacheRoute({ loaderData }: Route.ComponentProps) {
	const [searchParams] = useSearchParams()
	const submit = useSubmit()
	const query = searchParams.get('query') ?? ''
	const limit = searchParams.get('limit') ?? '100'
	const instance = searchParams.get('instance') ?? loaderData.instance

	const [selectedInstance, setSelectedInstance] = useState<string>(instance)

	const handleFormChange = useDebounce(async (form: HTMLFormElement) => {
		await submit(form)
	}, 400)

	return (
		<>
			<div className="flex items-center gap-4">
				<SidebarTrigger />
				<h2>Cache Admin</h2>
			</div>
			<Form
				method="get"
				className="flex flex-col gap-4"
				onChange={(e) => handleFormChange(e.currentTarget)}
			>
				<div className="flex-1">
					<div className="flex flex-1 items-end">
						<div>
							<Label>Search</Label>
							<Input type="search" name="query" defaultValue={query} />
						</div>
						<Button variant="outline" size="icon" type="submit">
							<Icon name="search" />
						</Button>
					</div>
				</div>
				<div className="flex flex-wrap gap-4">
					<div>
						<Label>Limit</Label>
						<Input
							type="number"
							name="limit"
							defaultValue={limit}
							step="1"
							min="1"
							max="10000"
							placeholder="Results limit"
						/>
					</div>
					<div>
						<input
							type="hidden"
							name="instance"
							value={selectedInstance}
							readOnly
						/>
						<Label>Instance</Label>
						<Select
							onValueChange={setSelectedInstance}
							value={selectedInstance}
						>
							<SelectTrigger className="w-56">
								<SelectValue placeholder="Instance" />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(loaderData.instances).map(([inst, region]) => (
									<SelectItem key={inst} value={inst}>
										{[
											inst,
											`(${region})`,
											inst === loaderData.currentInstanceInfo.currentInstance
												? '(current)'
												: '',
											inst === loaderData.currentInstanceInfo.primaryInstance
												? ' (primary)'
												: '',
										]
											.filter(Boolean)
											.join(' ')}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</Form>
			<div className="flex h-full flex-col gap-4 overflow-hidden">
				<h2>LRU Cache:</h2>
				<ul className="flex flex-col gap-2 overflow-y-auto overscroll-contain">
					{loaderData.cacheKeys.lru.map((key) => (
						<CacheKeyRow
							key={key}
							cacheKey={key}
							instance={instance}
							type="lru"
						/>
					))}
				</ul>
				<h2>SQLite Cache:</h2>
				<ul className="flex flex-col gap-2 overflow-y-auto overscroll-contain">
					{loaderData.cacheKeys.sqlite.map((key) => (
						<CacheKeyRow
							key={key}
							cacheKey={key}
							instance={instance}
							type="sqlite"
						/>
					))}
				</ul>
			</div>
		</>
	)
}

function CacheKeyRow({
	cacheKey,
	instance,
	type,
}: {
	cacheKey: string
	instance?: string
	type: 'sqlite' | 'lru'
}) {
	const fetcher = useFetcher<typeof action>()
	const dc = useDoubleCheck()
	const encodedKey = encodeURIComponent(cacheKey)
	const valuePage = `/admin/cache/${type}/${encodedKey}?instance=${instance}`
	return (
		<li className="flex items-center gap-2 font-mono">
			<fetcher.Form method="POST">
				<input type="hidden" name="cacheKey" value={cacheKey} />
				<input type="hidden" name="instance" value={instance} />
				<input type="hidden" name="type" value={type} />
				<Button
					size="sm"
					variant="secondary"
					{...dc.getButtonProps({ type: 'submit' })}
				>
					{fetcher.state === 'idle'
						? dc.doubleCheck
							? 'You sure?'
							: 'Delete'
						: 'Deleting...'}
				</Button>
			</fetcher.Form>
			<Link reloadDocument to={valuePage}>
				{cacheKey}
			</Link>
		</li>
	)
}
