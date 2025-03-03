import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '#app/utils/misc.tsx'

const cardVariants = cva('rounded-lg border shadow-xs', {
	variants: {
		variant: {
			default: 'bg-card text-card-foreground',
			muted: 'bg-muted text-muted-foreground',
		},
		size: {
			default: '',
			base: 'h-64 w-52',
			lg: 'h-80 w-64',
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'default',
	},
})

const Card = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>
>(({ variant, size, className, ...props }, ref) => (
	<div
		ref={ref}
		className={cardVariants({ variant, size, className })}
		{...props}
	/>
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn('flex flex-col space-y-1.5 p-6', className)}
		{...props}
	/>
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h3
		ref={ref}
		className={cn(
			'text-2xl font-semibold leading-none tracking-tight',
			className,
		)}
		{...props}
	/>
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<p
		ref={ref}
		className={cn('text-sm text-muted-foreground', className)}
		{...props}
	/>
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn('flex items-center p-6 pt-0', className)}
		{...props}
	/>
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
