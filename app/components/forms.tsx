import React, { useEffect, useId, useState } from 'react'
import { useInputControl } from '@conform-to/react'
import { cva, type VariantProps } from 'class-variance-authority'
import { REGEXP_ONLY_DIGITS_AND_CHARS, type OTPInputProps } from 'input-otp'

import { cn } from '#app/utils/misc.tsx'

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
							'bg-primary rounded-full p-2 size-10 grid place-content-center absolute z-10 cursor-pointer',
							fullRounded ? 'right-0 bottom-0' : '-right-5 -bottom-5',
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
