export interface VendorPointsGroup {
    name: string
    emoji?: string
    points: VendorPoints[]
}

export interface VendorPoints {
    name: string
    amount?: string | number
    decimals?: number
}
