relations_input_crm = """
// USER/ORGANIZATION
users.profileId - profiles.id
user_roles.userId > users.id
user_roles.roleId > roles.id
role_permissions.roleId > roles.id
role_permissions.permissionId > permissions.id
team_members.teamId > teams.id
team_members.userId > users.id
teams.leadId > users.id

// ACCOUNTS & CONTACTS
contacts.accountId > accounts.id
contacts_accounts.contactId > contacts.id
contacts_accounts.accountId > accounts.id
accounts.ownerId > users.id

// LEADS & CAMPAIGNS
leads.campaignId > campaigns.id
leads.ownerId > users.id
campaign_members.campaignId > campaigns.id
campaign_members.contactId > contacts.id
campaign_members.leadId > leads.id

// OPPORTUNITIES & SALES
opportunities.accountId > accounts.id
opportunities.primaryContactId > contacts.id
opportunities.ownerId > users.id
opportunities.pipelineId > pipelines.id
opportunity_products.opportunityId > opportunities.id
opportunity_products.productId > products.id

// QUOTES / ORDERS / INVOICES / PAYMENTS
quotes.opportunityId > opportunities.id
quotes.accountId > accounts.id
orders.quoteId > quotes.id
orders.accountId > accounts.id
invoices.orderId > orders.id
invoices.accountId > accounts.id
payments.invoiceId > invoices.id
payments.accountId > accounts.id

// ACTIVITIES / TASKS
activities.ownerId > users.id
activities.assignedTo > users.id
activity_assignments.activityId > activities.id
activity_assignments.fromUserId > users.id
activity_assignments.toUserId > users.id

// CASES / SUPPORT
cases.accountId > accounts.id
cases.contactId > contacts.id
cases.ownerId > users.id

// TAGS / NOTES / ATTACHMENTS
notes.authorId > users.id
attachments.uploadedBy > users.id

// EMAILS / INTEGRATIONS
emails.relatedToId > accounts.id
webhooks.lastDeliveredAt
integration_logs.provider

// AUDIT & SECURITY
audit_logs.performedBy > users.id
api_keys.userId > users.id

// MISC
profiles.userId > users.id
accounts.id < opportunities.accountId
contacts.id < notes.entityId
accounts.id < attachments.entityId
"""

relations_input_1 = """
users -> teams
workspaces -> folders
workspaces -> teams
chat -> workspaces
invite -> workspaces
invite -> users
users -> orders
orders -> order_items
order_items -> products
products -> categories
users -> reviews
products -> reviews
orders -> payments
users -> payments
orders -> shipments
shipments -> addresses
users -> carts
carts -> cart_items
cart_items -> products
users -> addresses
"""

relations_input_3 = """
users.profileId - profiles.id
posts.authorId > users.id
users.id > teams.id
comments.postId > posts.id
tags.userId > users.id
post_tags.postId > posts.id
post_tags.tagId > tags.id
user_roles.userId > users.id
user_roles.roleId > roles.id
role_permissions.roleId > roles.id
role_permissions.permissionId > permissions.id
projects.teamId > teams.id
milestones.projectId > projects.id
attachments.postId > posts.id
notifications.userId > roles.id
user_projects.userId > users.id
user_projects.projectId > projects.id
projects.id < posts.authorId
comments.userId > users.id
"""