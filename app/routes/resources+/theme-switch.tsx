import { json, type ActionFunctionArgs } from '@remix-run/node'
import { useFetcher, useFetchers } from '@remix-run/react'
import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
} from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { z } from 'zod'

import { useHints, useOptionalHints } from '#app/utils/client-hints.tsx'
import {
	useOptionalRequestInfo,
	useRequestInfo,
} from '#app/utils/request-info.ts'
import { setTheme } from '#app/utils/theme.server.ts'
import { colors, modes, type Color, type Mode } from '#app/utils/theme.ts'
import { Button } from '#app/components/ui/button.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuPortal,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import {
	ToggleGroup,
	ToggleGroupItem,
} from '#app/components/ui/toggle-group.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { ErrorList } from '#app/components/forms.tsx'

const ThemeFormSchema = z.object({
	mode: z.enum(modes),
	color: z.enum(colors),
})

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, {
		schema: ThemeFormSchema,
	})

	invariantResponse(submission.status === 'success', 'Invalid theme received')

	const { mode, color } = submission.value

	const responseInit = {
		headers: setTheme(mode, color),
	}

	return json({ result: submission.reply() }, responseInit)
}

export function ThemeSwitch() {
	const fetcher = useFetcher<typeof action>()

	const [form, fields] = useForm<z.infer<typeof ThemeFormSchema>>({
		id: 'theme-switch',
		lastResult: fetcher.data?.result,
	})

	const requestInfo = useRequestInfo()
	const userMode = requestInfo.userPrefs.theme.mode
	const userColor = requestInfo.userPrefs.theme.color

	const modeControl = useInputControl({
		...fields.mode,
		initialValue: userMode ?? 'system',
	})
	const colorControl = useInputControl({
		...fields.color,
		initialValue: userColor ?? 'yellow',
	})

	const optimisticTheme = useOptimisticTheme()

	const modeValue = optimisticTheme?.mode ?? modeControl.value
	const colorValue = optimisticTheme?.color ?? colorControl.value

	const modeIcons: Record<(typeof modes)[number], IconName> = {
		system: 'laptop',
		light: 'sun',
		dark: 'moon',
	}

	return (
		<TooltipProvider>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon">
						<Icon name="palette" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuPortal>
					<DropdownMenuContent sideOffset={8} align="start">
						<fetcher.Form
							method="POST"
							{...getFormProps(form)}
							action="/resources/theme-switch"
							className="space-y-2 p-4"
						>
							<h3>Theme</h3>
							<input
								{...getInputProps(fields.mode, { type: 'hidden' })}
								value={modeControl.value}
								readOnly
							/>
							<input
								{...getInputProps(fields.color, { type: 'hidden' })}
								value={colorControl.value}
								readOnly
							/>

							<div>
								<p>Mode</p>
								<ToggleGroup
									type="single"
									value={modeValue}
									onValueChange={(v: Mode) => modeControl.change(v)}
									className="grid grid-cols-4"
								>
									{modes.map((mode) => (
										<Tooltip key={mode}>
											<TooltipTrigger>
												<ToggleGroupItem
													value={mode}
													disabled={mode === modeValue}
													asChild
												>
													<div>
														<Icon name={modeIcons[mode]}>
															<span className="sr-only">{mode}</span>
														</Icon>
													</div>
												</ToggleGroupItem>
											</TooltipTrigger>
											<TooltipContent>{mode}</TooltipContent>
										</Tooltip>
									))}
								</ToggleGroup>
								<ErrorList errors={fields.mode.errors} />
							</div>
							<div>
								<p>Color</p>
								<ToggleGroup
									type="single"
									value={colorValue}
									onValueChange={(v: Color) => colorControl.change(v)}
									className="grid grid-cols-4"
								>
									{colors.map((color) => (
										<Tooltip key={color}>
											<TooltipTrigger>
												<ToggleGroupItem
													value={color}
													disabled={color === colorValue}
													asChild
												>
													<div>
														<span
															className={`${color} size-4 rounded-full bg-primary`}
														>
															<span className="sr-only">{color}</span>
														</span>
													</div>
												</ToggleGroupItem>
											</TooltipTrigger>
											<TooltipContent>{color}</TooltipContent>
										</Tooltip>
									))}
								</ToggleGroup>
								<ErrorList errors={fields.color.errors} />
							</div>
							<ErrorList errors={form.errors} id={form.errorId} />
						</fetcher.Form>
					</DropdownMenuContent>
				</DropdownMenuPortal>
			</DropdownMenu>
		</TooltipProvider>
	)
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticTheme() {
	const fetchers = useFetchers()
	const themeFetcher = fetchers.find(
		(f) => f.formAction === '/resources/theme-switch',
	)

	if (themeFetcher && themeFetcher.formData) {
		const submission = parseWithZod(themeFetcher.formData, {
			schema: ThemeFormSchema,
		})

		if (submission.status === 'success') {
			return {
				mode: submission.value.mode,
				color: submission.value.color,
			}
		}
	}
}

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
	const hints = useHints()
	const requestInfo = useRequestInfo()
	const optimisticTheme = useOptimisticTheme()

	if (optimisticTheme) {
		return {
			mode:
				optimisticTheme.mode === 'system' ? hints.theme : optimisticTheme.mode,
			color: optimisticTheme.color,
		}
	}
	return {
		mode: requestInfo.userPrefs.theme.mode ?? hints.theme,
		color: requestInfo.userPrefs.theme.color ?? 'yellow',
	}
}

export function useOptionalTheme() {
	const optionalHints = useOptionalHints()
	const optionalRequestInfo = useOptionalRequestInfo()
	const optimisticTheme = useOptimisticTheme()
	if (optimisticTheme) {
		return {
			mode:
				optimisticTheme.mode === 'system'
					? optionalHints?.theme
					: optimisticTheme.mode,
			color: optimisticTheme.color,
		}
	}
	return {
		mode: optionalRequestInfo?.userPrefs.theme.mode ?? optionalHints?.theme,
		color: optionalRequestInfo?.userPrefs.theme.color ?? 'yellow',
	}
}
