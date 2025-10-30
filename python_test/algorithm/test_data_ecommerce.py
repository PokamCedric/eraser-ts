"""
E-commerce test data - Complex example with pivot entities
"""

dsl_ecommerce = """
users.teams - teams.id
workspaces.folderId > folders.id
workspaces.teamId > teams.id
chat.workspaceId > workspaces.id
invite.workspaceId > workspaces.id
invite.inviterId > users.id
users.id < orders.userId
orders.id > order_items.orderId
order_items.productId > products.id
products.categoryId > categories.id
users.id > reviews.userId
products.id > reviews.productId
orders.paymentId > payments.id
users.id > payments.userId
orders.id > payments.orderId
orders.shipmentId > shipments.id
shipments.addressId > addresses.id
users.id > carts.userId
carts.id > cart_items.cartId
cart_items.productId > products.id
users.id > addresses.userId
orders.id > shipments.orderId
users.addressId > addresses.id
"""
