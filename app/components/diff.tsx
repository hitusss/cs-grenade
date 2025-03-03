import { cn } from '#app/utils/misc.js'

import { Icon } from './ui/icon.tsx'

type DiffViewProps = {
	name: string
	oldValue?: React.ReactNode
	newValue?: React.ReactNode
	deleted?: boolean
}

export function DiffView({ name, oldValue, newValue, deleted }: DiffViewProps) {
	return (
		<div>
			<p className="text-caption">{name}</p>
			<div className="flex flex-wrap *:flex-1">
				<DiffCell
					isDeleted={Boolean(oldValue) && (deleted || newValue !== undefined)}
				>
					{oldValue}
				</DiffCell>
				<DiffCell isNew={Boolean(newValue)}>{newValue}</DiffCell>
			</div>
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
			className={cn('flex items-center gap-1 p-1', {
				'border-t-2 border-b-2': isNew || isDeleted,
				'border-diff-green bg-diff-green/50': isNew,
				'border-diff-red bg-diff-red/50': isDeleted,
			})}
		>
			{isNew || isDeleted ? (
				<Icon
					name={isNew ? 'plus' : 'minus'}
					className={cn({
						'text-diff-green': isNew,
						'text-diff-red': isDeleted,
					})}
				/>
			) : null}
			{children}
		</div>
	)
}
