import fsExtra from 'fs-extra'
import satori from 'satori'

import { prisma } from '#app/utils/db.server.ts'
import { toSlug } from '#app/utils/misc.tsx'

import { type Route } from './+types/social-image.ts'

const mapLogoPositions: Array<{
	top?: string
	right?: string
	bottom?: string
	left?: string
	transform?: string
}> = [
	{
		top: '-7%',
		left: '2%',
		transform: 'rotate(16deg)',
	},
	{
		top: '5%',
		right: '-4%',
		transform: 'rotate(-12deg)',
	},
	{
		bottom: '-7%',
		right: '12%',
		transform: 'rotate(22deg)',
	},
	{
		bottom: '2%',
		left: '-8%',
		transform: 'rotate(24deg)',
	},
]

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const searchParams = url.searchParams

	const title = searchParams.get('title') ?? 'CSGrenade'
	const description = searchParams.get('description')
	const spMap = searchParams.get('map')

	const map = spMap
		? await prisma.mapLogo.findFirst({
				where: {
					mapName: spMap,
				},
				select: {
					id: true,
				},
			})
		: null
	const maps = map
		? new Array(4).fill(map)
		: await prisma.mapLogo.findMany({
				select: {
					id: true,
				},
				take: 4,
			})
	if (maps.length > mapLogoPositions.length) {
		throw new Error('Too many maps logos to display')
	}

	const fontBold = await fsExtra.readFile('./public/font/Geist-Bold.ttf')
	const fontRegular = await fsExtra.readFile('./public/font/Geist-Regular.ttf')

	const img = await satori(
		<div
			style={{
				height: '100%',
				width: '100%',
				overflow: 'hidden',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: '#fff',
				backgroundImage:
					'radial-gradient(circle at 25px 25px, #facc1580 2%, transparent 0%), radial-gradient(circle at 75px 75px, #facc1580 2%, transparent 0%)',
				backgroundSize: '100px 100px',
				color: '#0c0a09',
				padding: '12px',
			}}
		>
			{maps.map((m, idx) => (
				<img
					key={idx}
					src={`${url.origin}/resources/map-logos/${m.id}`}
					style={{
						position: 'absolute',
						width: '148px',
						height: '148px',
						...mapLogoPositions[idx],
					}}
				/>
			))}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexGrow: 1,
					flexShrink: 1,
					flexBasis: '0%',
				}}
			>
				<svg
					width="256"
					height="256"
					viewBox="0 0 1000 1000"
					fill="#facc15"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						fillRule="evenodd"
						clipRule="evenodd"
						d="M688.033 85C651.418 85 621.736 114.682 621.736 151.297C621.736 151.362 621.736 151.428 621.736 151.493L621.736 151.597L609.747 149.912C610.487 107.309 645.253 73 688.033 73C731.275 73 766.33 108.055 766.33 151.297C766.33 174.492 756.244 195.331 740.219 209.668C737.618 206.581 734.991 203.564 732.338 200.616C745.839 188.48 754.33 170.88 754.33 151.297C754.33 114.682 724.647 85 688.033 85ZM732.338 200.616C720.596 211.171 705.064 217.594 688.033 217.594C651.518 217.594 621.898 188.074 621.736 151.597L690.492 161.26C705.036 172.728 719.011 185.804 732.338 200.616ZM740.219 209.668C726.368 222.06 708.08 229.594 688.033 229.594C644.79 229.594 609.736 194.539 609.736 151.297C609.736 150.834 609.74 150.373 609.747 149.912L375.979 117.058C373.792 116.75 371.907 118.294 371.6 120.482L364.269 172.647C363.961 174.834 365.485 176.857 367.673 177.165L401.94 181.98C404.128 182.288 405.652 184.311 405.344 186.498L403.224 201.588C402.916 203.776 404.44 205.799 406.628 206.106L420.565 208.065L414.277 252.811L406.092 251.66C403.905 251.353 401.882 252.877 401.575 255.065L399.941 266.691C260.629 289.915 146.629 401.923 126.203 549.333C101.102 730.489 226.204 898.439 407.311 923.892C588.419 949.345 754.967 822.384 780.772 641.326C801.769 493.997 723.059 354.905 595.545 294.181L597.179 282.555C597.487 280.368 595.963 278.345 593.775 278.037L585.589 276.887L591.878 232.141L598.91 233.129L678.813 244.359C794.642 312.153 833.917 444.011 870.562 601.235C871.689 606.071 878.172 604.974 877.603 600.042C856.03 413.154 806.726 288.604 740.219 209.668ZM233.934 476.984C227.925 478.707 223.406 483.678 222.261 489.823L210.386 553.574C209.917 556.091 210.041 558.683 210.746 561.144L272.484 776.451C273.19 778.911 274.459 781.174 276.19 783.061L320.044 830.832C324.271 835.437 330.738 837.258 336.747 835.535L487.131 792.413C498.921 789.032 503.032 774.428 494.738 765.393L451.352 718.131C447.124 713.526 440.657 711.706 434.649 713.429L354.963 736.278L301.98 551.505L381.666 528.656C387.675 526.932 392.194 521.961 393.339 515.816L405.088 452.744C407.333 440.688 396.108 430.481 384.319 433.862L233.934 476.984ZM449.901 415.057C443.938 416.766 439.437 421.677 438.252 427.768L425.82 491.68C425.322 494.236 425.437 496.874 426.155 499.379L448.943 578.85C449.661 581.355 450.963 583.653 452.738 585.557L504.047 640.563L600.746 612.835L614.779 661.777L499.68 694.781C487.836 698.177 483.757 712.886 492.162 721.897L536.099 769.001C540.331 773.537 546.75 775.317 552.714 773.607L682.826 736.298C688.833 734.575 693.354 729.605 694.498 723.459L694.499 723.457L707.087 655.88L682.151 568.92L635.666 518.282L635.665 518.281C631.436 513.675 624.969 511.856 618.962 513.578L531.422 538.68L517.389 489.738L604.928 464.636C610.935 462.914 615.456 457.944 616.601 451.797L616.601 451.796L628.349 388.725C630.595 376.668 619.369 366.462 607.58 369.843L449.901 415.057Z"
					/>
				</svg>
			</div>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					flexGrow: 1,
					flexShrink: 1,
					flexBasis: '0%',
				}}
			>
				<div
					style={{
						display: 'flex',
						textWrap: 'balance',
						fontSize: 32,
						fontWeight: 700,
						lineHeight: 1.2,
					}}
				>
					{title}
				</div>
				<div
					style={{
						fontSize: 18,
						fontWeight: 500,
						lineHeight: 1.4,
					}}
				>
					{description}
				</div>
			</div>
		</div>,
		{
			width: 600,
			height: 400,
			fonts: [
				{
					name: 'Geist',
					data: fontBold,
					weight: 700,
					style: 'normal',
				},
				{
					name: 'Geist',
					data: fontRegular,
					weight: 500,
					style: 'normal',
				},
			],
		},
	)

	const imgBuffer = Buffer.from(img)

	return new Response(imgBuffer, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Content-Length': Buffer.byteLength(imgBuffer).toString(),
			'Content-Disposition': `inline; filename="${toSlug(`social-image-${title}-${description}-${spMap}`)}"`,
			'Cache-Control': 'public, max-age=1209600, immutable',
		},
	})
}
