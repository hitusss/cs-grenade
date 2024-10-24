type SocialImageProps = {
	title?: string
	description?: string
	map?: string
}

const DEFAULT_TITLE = 'CSGrenade'
const DEFAULT_DESCRIPTION = 'Your place to learn and share CS2 grenades.'

function getSocialImage({
	title = DEFAULT_TITLE,
	description = DEFAULT_DESCRIPTION,
	map,
}: SocialImageProps) {
	const searchParams = new URLSearchParams()
	if (title) {
		searchParams.append('title', title)
	}
	if (description) {
		searchParams.append('description', description)
	}
	if (map) {
		searchParams.append('map', map)
	}
	return `/resources/social-image?${searchParams.toString()}`
}

export function getSocialMetas({
	url,
	title = DEFAULT_TITLE,
	description = DEFAULT_DESCRIPTION,
	image = {},
}: {
	url: string
	title?: string
	description?: string
	image?: SocialImageProps
}) {
	return [
		{ title: title },
		{
			name: 'description',
			content: description,
		},

		{
			name: 'og:url',
			content: url,
		},
		{
			name: 'og:title',
			content: title,
		},
		{
			name: 'og:description',
			content: description,
		},
		{
			name: 'og:image',
			content: getSocialImage(image),
		},
		{
			name: 'og:image:alt',
			content: 'CSGrenade',
		},

		{
			name: 'twitter:card',
			content: 'summary_large_image',
		},
		{
			name: 'twitter:creator',
			content: '@',
		},
		{
			name: 'twitter:site',
			content: '@',
		},
		{
			name: 'twitter:title',
			content: title,
		},
		{
			name: 'twitter:description',
			content: description,
		},
		{
			name: 'twitter:image',
			content: getSocialImage(image),
		},
		{
			name: 'twitter:image:alt',
			content: 'CSGrenade',
		},
	]
}
