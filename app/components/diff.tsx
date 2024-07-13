import { cn } from '#app/utils/misc.js'

import { Icon } from './ui/icon.tsx'

type DiffViewProps = {
	oldValue?: React.ReactNode
	newValue?: React.ReactNode
	deleted?: boolean
}

export function DiffView({ oldValue, newValue, deleted }: DiffViewProps) {
	return (
		<div className="flex flex-wrap [&>*]:flex-1">
			{oldValue ? (
				<DiffCell isDeleted={deleted || newValue !== undefined}>
					{oldValue}
				</DiffCell>
			) : null}
			{newValue ? <DiffCell isNew>{newValue}</DiffCell> : null}
		</div>
	)
}

function DiffCell({
	children,
	isNew,
	isDeleted,
}: {
	children: React.ReactNode
	isNew?: boolean
	isDeleted?: boolean
}) {
	return (
		<div
			className={cn('flex items-center gap-1 border-b-2 border-t-2 p-1', {
				'border-diff-green bg-diff-green/50': isNew,
				'border-diff-red bg-diff-red/50': isDeleted,
			})}
		>
			<Icon
				name={isNew ? 'plus' : 'minus'}
				className={cn({
					'text-diff-green': isNew,
					'text-diff-red': isDeleted,
				})}
			/>
			{children}
		</div>
	)
}
