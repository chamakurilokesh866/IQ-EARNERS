export type PrizeItem = {
  id: string
  title: string
  category: string
  image: string
  description: string
  spotsLeft: number
  totalSpots: number
}

export const PRIZE_ITEMS: PrizeItem[] = [
  { id: "iphone", title: "iPhone 15 Pro", category: "Phones", image: "/images/phone.svg", description: "Titanium design, A17 Pro chip.", spotsLeft: 320, totalSpots: 500 },
  { id: "macbook", title: "MacBook Air M3", category: "Laptops", image: "/images/laptop.svg", description: "M3 chip, all-day battery.", spotsLeft: 210, totalSpots: 400 },
  { id: "ipad", title: "iPad Pro 12.9", category: "Tablets", image: "/images/ipad.svg", description: "M2 chip, Liquid Retina XDR.", spotsLeft: 180, totalSpots: 350 },
  { id: "dslr", title: "DSLR Camera Pack", category: "Cameras", image: "/images/camera.svg", description: "Bundle with lens kit.", spotsLeft: 95, totalSpots: 200 },
  { id: "gold", title: "10,000₹ GiftCard", category: "Vouchers", image: "/images/gift.svg", description: "Amazon/Flipkart gift card.", spotsLeft: 420, totalSpots: 800 },
  { id: "city", title: "Holiday Getaway", category: "Travel", image: "/images/city.svg", description: "3-day stay and tour.", spotsLeft: 60, totalSpots: 120 }
]
