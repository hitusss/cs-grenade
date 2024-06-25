import React, {
	createContext,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from 'react'
import { useInputControl } from '@conform-to/react'
import { cva, type VariantProps } from 'class-variance-authority'
import { REGEXP_ONLY_DIGITS_AND_CHARS, type OTPInputProps } from 'input-otp'

import { cn } from '#app/utils/misc.tsx'

import { Button, buttonVariants } from './ui/button.tsx'
import { Checkbox, type CheckboxProps } from './ui/checkbox.tsx'
import { Icon } from './ui/icon.tsx'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from './ui/input-otp.tsx'
import { Input } from './ui/input.tsx'
import { Label, labelVariants } from './ui/label.tsx'
import { Textarea } from './ui/textarea.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './ui/tooltip.tsx'

export type ListOfErrors = Array<string | null | undefined> | null | undefined

export function ErrorList({
	id,
	errors,
}: {
	errors?: ListOfErrors
	id?: string
}) {
	const errorsToRender = errors?.filter(Boolean)
	if (!errorsToRender?.length) return null
	return (
		<ul id={id} className="flex flex-col gap-1">
			{errorsToRender.map((e) => (
				<li key={e} className="text-[10px] text-foreground-destructive">
					{e}
				</li>
			))}
		</ul>
	)
}

export function Field({
	labelProps,
	inputProps,
	errors,
	className,
}: {
	labelProps: React.LabelHTMLAttributes<HTMLLabelElement>
	inputProps: React.InputHTMLAttributes<HTMLInputElement>
	errors?: ListOfErrors
	className?: string
}) {
	const fallbackId = useId()
	const id = inputProps.id ?? fallbackId
	const errorId = errors?.length ? `${id}-error` : undefined
	return (
		<div className={className}>
			<Label htmlFor={id} {...labelProps} />
			<Input
				id={id}
				aria-invalid={errorId ? true : undefined}
				aria-describedby={errorId}
				{...inputProps}
			/>
			<div className="min-h-[32px] px-4 pb-3 pt-1">
				{errorId ? <ErrorList id={errorId} errors={errors} /> : null}
			</div>
		</div>
	)
}

export function OTPField({
	labelProps,
	inputProps,
	errors,
	className,
}: {
	labelProps: React.LabelHTMLAttributes<HTMLLabelElement>
	inputProps: Partial<OTPInputProps & { render: never }>
	errors?: ListOfErrors
	className?: string
}) {
	const fallbackId = useId()
	const id = inputProps.id ?? fallbackId
	const errorId = errors?.length ? `${id}-error` : undefined
	return (
		<div className={className}>
			<Label htmlFor={id} {...labelProps} />
			<InputOTP
				pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
				maxLength={6}
				id={id}
				aria-invalid={errorId ? true : undefined}
				aria-describedby={errorId}
				{...inputProps}
			>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
					<InputOTPSlot index={2} />
				</InputOTPGroup>
				<InputOTPSeparator />
				<InputOTPGroup>
					<InputOTPSlot index={3} />
					<InputOTPSlot index={4} />
					<InputOTPSlot index={5} />
				</InputOTPGroup>
			</InputOTP>
			<div className="min-h-[32px] px-4 pb-3 pt-1">
				{errorId ? <ErrorList id={errorId} errors={errors} /> : null}
			</div>
		</div>
	)
}

export function TextareaField({
	labelProps,
	textareaProps,
	errors,
	className,
}: {
	labelProps: React.LabelHTMLAttributes<HTMLLabelElement>
	textareaProps: React.TextareaHTMLAttributes<HTMLTextAreaElement>
	errors?: ListOfErrors
	className?: string
}) {
	const fallbackId = useId()
	const id = textareaProps.id ?? textareaProps.name ?? fallbackId
	const errorId = errors?.length ? `${id}-error` : undefined
	return (
		<div className={className}>
			<Label htmlFor={id} {...labelProps} />
			<Textarea
				id={id}
				aria-invalid={errorId ? true : undefined}
				aria-describedby={errorId}
				{...textareaProps}
			/>
			<div className="min-h-[32px] px-4 pb-3 pt-1">
				{errorId ? <ErrorList id={errorId} errors={errors} /> : null}
			</div>
		</div>
	)
}

export function CheckboxField({
	labelProps,
	buttonProps,
	errors,
	className,
}: {
	labelProps: JSX.IntrinsicElements['label']
	buttonProps: CheckboxProps & {
		name: string
		form: string
		value?: string
	}
	errors?: ListOfErrors
	className?: string
}) {
	const { key, defaultChecked, ...checkboxProps } = buttonProps
	const fallbackId = useId()
	const checkedValue = buttonProps.value ?? 'on'
	const input = useInputControl({
		key,
		name: buttonProps.name,
		formId: buttonProps.form,
		initialValue: defaultChecked ? checkedValue : undefined,
	})
	const id = buttonProps.id ?? fallbackId
	const errorId = errors?.length ? `${id}-error` : undefined

	return (
		<div className={className}>
			<div className="flex gap-2">
				<Checkbox
					{...checkboxProps}
					id={id}
					aria-invalid={errorId ? true : undefined}
					aria-describedby={errorId}
					checked={input.value === checkedValue}
					onCheckedChange={(state) => {
						input.change(state.valueOf() ? checkedValue : '')
						buttonProps.onCheckedChange?.(state)
					}}
					onFocus={(event) => {
						input.focus()
						buttonProps.onFocus?.(event)
					}}
					onBlur={(event) => {
						input.blur()
						buttonProps.onBlur?.(event)
					}}
					type="button"
				/>
				<label
					htmlFor={id}
					{...labelProps}
					className="self-center text-body-xs text-muted-foreground"
				/>
			</div>
			<div className="px-4 pb-3 pt-1">
				{errorId ? <ErrorList id={errorId} errors={errors} /> : null}
			</div>
		</div>
	)
}

const imageFieldVariants = cva('object-cover', {
	variants: {
		size: {
			default: 'size-32',
			sm: 'size-16',
			lg: 'size-48',
		},
		fullRounded: {
			true: 'rounded-full',
			false: 'rounded-md',
		},
	},
	defaultVariants: {
		size: 'default',
		fullRounded: false,
	},
})

export function ImageField({
	labelProps,
	inputProps,
	errors,
	className,
	existingImage,
	size,
	fullRounded,
}: {
	labelProps: React.LabelHTMLAttributes<HTMLLabelElement>
	inputProps: React.InputHTMLAttributes<HTMLInputElement>
	errors?: ListOfErrors
	className?: string
	existingImage?: string
} & VariantProps<typeof imageFieldVariants>) {
	const [imageSrc, setImageSrc] = useState<string | undefined>()
	const fallbackId = useId()
	const id = inputProps.id ?? fallbackId
	const errorId = errors?.length ? `${id}-error` : undefined

	return (
		<div>
			<label htmlFor={id} className="relative grid gap-1">
				<span className={labelVariants({ className: 'px-2' })}>
					{labelProps.children}
				</span>
				{imageSrc || existingImage ? (
					<span
						className={cn(
							'absolute z-10 grid size-10 cursor-pointer place-content-center rounded-full bg-primary p-2',
							fullRounded ? 'bottom-0 right-0' : '-bottom-5 -right-5',
						)}
					>
						<Icon name="pencil" />
					</span>
				) : null}
				<div
					className={cn(
						imageFieldVariants({
							size,
							fullRounded,
						}),
						'relative ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
						className,
					)}
				>
					<div
						className={cn(
							imageFieldVariants({ size, fullRounded }),
							'grid place-items-center border-2',
							className,
						)}
					>
						{imageSrc || existingImage ? (
							<img
								src={imageSrc ?? existingImage}
								className={cn(
									imageFieldVariants({
										size,
										fullRounded,
									}),
									className,
								)}
								alt=""
							/>
						) : (
							<Icon name="plus" className="size-6 text-border" />
						)}
						<input
							id={id}
							aria-invalid={errorId ? true : undefined}
							aria-describedby={errorId}
							{...inputProps}
							type="file"
							accept={inputProps.accept ?? 'image/jpeg, image/png'}
							className={cn(
								imageFieldVariants({
									size,
									fullRounded,
								}),
								'absolute inset-0 z-0 cursor-pointer opacity-0',
							)}
							onChange={(e) => {
								const file = e.currentTarget.files?.[0]
								if (file) {
									const reader = new FileReader()
									reader.onload = (event) => {
										setImageSrc(event.target?.result?.toString() ?? undefined)
									}
									reader.readAsDataURL(file)
								}
							}}
						/>
					</div>
				</div>
			</label>

			<div
				className={imageFieldVariants({
					size,
					fullRounded,
					className: 'h-auto min-h-[32px] pb-3 pt-1',
				})}
			>
				{errorId ? <ErrorList id={errorId} errors={errors} /> : null}
			</div>
		</div>
	)
}

export const MultipleImageField = {
	Provider: MultipleImageFieldProvider,
	Input: MultipleImageFieldInput,
	Display: MultipleImageFieldDisplay,
}

const MultipleImageFieldContext = createContext<
	| {
			files: DataTransfer | undefined
			setFiles: React.Dispatch<React.SetStateAction<DataTransfer | undefined>>
			imagesSrc: string[]
			setImagesSrc: React.Dispatch<React.SetStateAction<string[]>>
			inputProps: React.InputHTMLAttributes<HTMLInputElement>
			errors?: ListOfErrors
			id: string
			errorId?: string
	  }
	| undefined
>(undefined)

function MultipleImageFieldProvider({
	children,
	inputProps,
	errors,
}: {
	children: React.ReactNode
	inputProps: React.InputHTMLAttributes<HTMLInputElement>
	errors?: ListOfErrors
}) {
	const [files, setFiles] = useState<DataTransfer>()
	const [imagesSrc, setImagesSrc] = useState<string[]>([])

	const fallbackId = useId()
	const id = inputProps.id ?? fallbackId
	const errorId = errors?.length ? `${id}-error` : undefined

	return (
		<MultipleImageFieldContext.Provider
			value={{
				files,
				setFiles,
				imagesSrc,
				setImagesSrc,
				inputProps,
				errors,
				id,
				errorId,
			}}
		>
			{children}
		</MultipleImageFieldContext.Provider>
	)
}

function MultipleImageFieldInput({
	variant = 'ghost',
	size = 'icon',
	className,
	...props
}: VariantProps<typeof buttonVariants> & { className?: string }) {
	const inputRef = useRef<HTMLInputElement>(null)
	const context = useContext(MultipleImageFieldContext)
	if (!context)
		throw new Error(
			'MultipleImageFieldInput must be used inside of MultipleImageFieldProvider',
		)

	useEffect(() => {
		if (!inputRef.current || !context.files?.files) return
		inputRef.current.files = context.files.files
	}, [context.files?.files, context.files?.files?.length, context.id])

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<label
						htmlFor={context.id}
						className={cn(
							buttonVariants({
								variant,
								size,
								...props,
							}),
							'relative',
							className,
						)}
					>
						<input
							ref={inputRef}
							id={context.id}
							aria-invalid={context.errorId ? true : undefined}
							aria-describedby={context.errorId}
							{...context.inputProps}
							type="file"
							accept="image/jpeg, image/png"
							multiple
							className="absolute inset-0 opacity-0"
							onChange={(e) => {
								if (!e.currentTarget.files?.length) {
									return context.setFiles(undefined)
								}
								for (let i = 0; i < e.currentTarget.files.length; i++) {
									const file = e.currentTarget.files?.[i]
									if (file) {
										const reader = new FileReader()
										reader.onload = (event) => {
											const img = event.target?.result?.toString()
											if (img && context.imagesSrc.indexOf(img) === -1) {
												context.setFiles((prev) => {
													if (!prev) {
														prev = new DataTransfer()
													}
													prev.items.add(file)
													return prev
												})
												context.setImagesSrc((prev) => [...prev, img])
											}
										}
										reader.readAsDataURL(file)
									}
								}
							}}
						/>
						<Icon name="file-plus" />
					</label>
				</TooltipTrigger>
				<TooltipContent>Add image</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

function MultipleImageFieldDisplay({
	size = 'sm',
	...props
}: VariantProps<typeof imageFieldVariants>) {
	const context = useContext(MultipleImageFieldContext)
	if (!context)
		throw new Error(
			'MultipleImageFieldDisplay must be used inside of MultipleImageFieldProvider',
		)

	return (
		<div className="flex flex-col gap-2">
			<ul className="flex flex-wrap gap-2">
				{context.imagesSrc.map((img, index) => (
					<li key={img} className="relative p-4">
						<img
							src={img}
							className={imageFieldVariants({ size, ...props })}
							alt=""
						/>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="destructive"
										size="icon"
										className="absolute right-0 top-0 size-7 rounded-full"
										onClick={() => {
											context.setFiles((prev) => {
												prev?.items.remove(index)
												return prev
											})
											context.setImagesSrc((prev) => {
												prev.splice(index, 1)
												return [...prev]
											})
										}}
									>
										<Icon name="x" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Remove image</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</li>
				))}
			</ul>

			<div className="h-auto min-h-[32px] pb-3 pt-1">
				{context.errorId ? (
					<ErrorList id={context.errorId} errors={context.errors} />
				) : null}
			</div>
		</div>
	)
}
