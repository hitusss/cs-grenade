export type PickNullable<T> = {
	[P in keyof T as null extends T[P] ? P : never]: T[P]
}

export type PickNotNullable<T> = {
	[P in keyof T as null extends T[P] ? never : P]: T[P]
}

export type OptionalNullable<T> = {
	[K in keyof PickNullable<T>]?: T[K] | null
} & {
	[K in keyof PickNotNullable<T>]: T[K]
}
