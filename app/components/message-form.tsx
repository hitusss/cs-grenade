import { useRef } from 'react'
import { Form } from '@remix-run/react'
import {
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
	type SubmissionResult,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { HoneypotInputs } from 'remix-utils/honeypot/react'

import { cn, useIsPending } from '#app/utils/misc.tsx'
import { MessageSchema } from '#app/utils/validators/message.ts'

import { ErrorList, MultipleImageField, TextareaField } from './forms.tsx'
import { Button } from './ui/button.tsx'
import { Icon } from './ui/icon.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './ui/tooltip.tsx'

type MessageFormProps = {
	result?: SubmissionResult
}

export function MessageForm({ result }: MessageFormProps) {
	const sendRef = useRef<HTMLButtonElement>(null)

	const [form, fields] = useForm({
		id: 'new-message',
		constraint: getZodConstraint(MessageSchema),
		lastResult: result,
		shouldRevalidate: 'onBlur',
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: MessageSchema })
		},
	})

	const isPending = useIsPending()

	return (
		<Form
			method="POST"
			encType="multipart/form-data"
			{...getFormProps(form)}
			className="w-full"
		>
			<MultipleImageField.Provider
				key={fields.images.key}
				inputProps={{
					...getInputProps(fields.images, { type: 'file' }),
					required: false,
					defaultValue: undefined,
				}}
				errors={fields.images.errors}
			>
				<div className="flex w-full gap-2">
					<HoneypotInputs />

					<TextareaField
						labelProps={{}}
						textareaProps={{
							...getTextareaProps(fields.message),
							autoFocus: true,
							placeholder: 'Type here...',
							className: 'resize-none min-h-[52px]',
							onKeyDown: (e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault()
									sendRef.current?.click()
								}
							},
						}}
						errors={fields.message.errors}
						className="flex-1"
					/>

					<div className="flex gap-2 py-2">
						<MultipleImageField.Input />

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										type="submit"
										name="intent"
										value="new-message"
										disabled={isPending}
										ref={sendRef}
									>
										<Icon
											name={isPending ? 'refresh-cw' : 'send'}
											className={cn({
												'animate-spin': isPending,
											})}
										/>
									</Button>
								</TooltipTrigger>
								<TooltipContent>Send message</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>
				<MultipleImageField.Display />

				<ErrorList errors={form.errors} />
			</MultipleImageField.Provider>
		</Form>
	)
}
