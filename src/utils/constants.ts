import { ButtonStyle, ComponentButton, ComponentType, PartialEmoji } from 'slash-create'


export const RED_BUTTON = (label: string, customID: string, disabled?: boolean, icon?: string | PartialEmoji): ComponentButton => ({
	type: ComponentType.BUTTON,
	label,
	custom_id: customID,
	style: ButtonStyle.DESTRUCTIVE,
	disabled,
	emoji: icon ?
		typeof icon === 'string' ? { name: icon } :
			icon :
		undefined
})

export const BLUE_BUTTON = (label: string, customID: string, disabled?: boolean, icon?: string | PartialEmoji): ComponentButton => ({
	type: ComponentType.BUTTON,
	label,
	custom_id: customID,
	style: ButtonStyle.PRIMARY,
	disabled,
	emoji: icon ?
		typeof icon === 'string' ? { name: icon } :
			icon :
		undefined
})

export const GRAY_BUTTON = (label: string, customID: string, disabled?: boolean, icon?: string | PartialEmoji): ComponentButton => ({
	type: ComponentType.BUTTON,
	label,
	custom_id: customID,
	style: ButtonStyle.SECONDARY,
	disabled,
	emoji: icon ?
		typeof icon === 'string' ? { name: icon } :
			icon :
		undefined
})

export const GREEN_BUTTON = (label: string, customID: string, disabled?: boolean, icon?: string | PartialEmoji): ComponentButton => ({
	type: ComponentType.BUTTON,
	label,
	custom_id: customID,
	style: ButtonStyle.SUCCESS,
	disabled,
	emoji: icon ?
		typeof icon === 'string' ? { name: icon } :
			icon :
		undefined
})

export const PREVIOUS_BUTTON = (disabled: boolean): ComponentButton => ({
	type: ComponentType.BUTTON,
	label: 'Previous Page',
	custom_id: 'previous',
	style: ButtonStyle.SECONDARY,
	disabled
})

export const NEXT_BUTTON = (disabled: boolean): ComponentButton => ({
	type: ComponentType.BUTTON,
	label: 'Next Page',
	custom_id: 'next',
	style: ButtonStyle.SECONDARY,
	disabled
})
