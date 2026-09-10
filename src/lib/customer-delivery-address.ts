export type CustomerDeliveryAddress = { street: string; house: string; apartment: string; entrance: string; floor: string; comment: string };

export function formatCustomerDeliveryAddress(value: CustomerDeliveryAddress): string {
  return [value.street.trim(), value.house.trim() && `дом ${value.house.trim()}`,
    value.apartment.trim() && `кв./офис ${value.apartment.trim()}`,
    value.entrance.trim() && `подъезд ${value.entrance.trim()}`,
    value.floor.trim() && `этаж ${value.floor.trim()}`,
    value.comment.trim() && `Комментарий: ${value.comment.trim()}`].filter(Boolean).join(", ");
}

export function isCustomerDeliveryAddressReady(value: CustomerDeliveryAddress): boolean {
  return value.street.trim().length >= 2 && value.house.trim().length > 0
    && formatCustomerDeliveryAddress(value).length <= 500;
}
