/**
 * Default DSL Data
 *
 * Contains the default DSL schema loaded when the application starts.
 */

export let DEFAULT_DSL = ''; // assigned below after DSL_CRM is defined

const DSL_1 = `
// Comprehensive Relationships Demo
// This example demonstrates all relationship types and features

// Users entity
users {
    id uuid @pk
    username string @unique @required
    email string @unique @required
    profileId uuid @fk
}

// Profiles entity (one-to-one with users)
profiles {
    id uuid @pk
    userId uuid @fk @unique
    bio text
    avatar string
}

// Teams entity
teams {
    id uuid @pk
    name string @required
    description text
}

// Posts entity
posts {
    id uuid @pk
    authorId uuid @fk @required
    title string @required
    content text
    status string @enum(fields: [draft, published, archived])
}

// Comments entity
comments {
    id uuid @pk
    postId uuid @fk @required
    text text @required
    createdAt timestamp @default(now)
  userId uuid required
}

// Tags entity (for many-to-many with posts)
tags {
    id uuid @pk
    userId uuid @fk @required
    name string @unique @required
}

// Post-Tags junction table (many-to-many)
post_tags {
    id uuid @pk
    postId uuid @fk @required
    tagId uuid @fk @required
}
roles [icon: shield, color: orange] {

  id uuid pk
  name string unique required
  description text
}
permissions [icon: key, color: green] {

  id uuid pk
  name string unique required
  description text
}
user_roles [icon: users, color: purple] {

  id uuid pk
  userId uuid required
  roleId uuid required
}
role_permissions [icon: lock, color: teal] {

  id uuid pk
  roleId uuid required
  permissionId uuid required
}
projects [icon: folder, color: blue] {

  id uuid pk
  name string required
  description text
  teamId uuid required
  createdAt timestamp
}
milestones [icon: flag, color: yellow] {

  id uuid pk
  projectId uuid required
  name string required
  dueDate date
  status string
}
attachments [icon: paperclip, color: gray] {

  id uuid pk
  postId uuid required
  filename string required
  url string required
  uploadedAt timestamp
}
notifications [icon: bell, color: red] {

  id uuid pk
  userId uuid required
  message string required
  read boolean
  createdAt timestamp
}
user_projects [icon: users, color: pink] {

  id uuid pk
  userId uuid required
  projectId uuid required
}


// ============================================
// RELATIONSHIPS
// ============================================

// One-to-One: Users to Profiles
// Each user has exactly one profile
users.profileId - profiles.id

// Many-to-One: Posts to Users
// Many posts belong to one author (user)
posts.authorId > users.id

// Many-to-One: Users to Teams
// Many users belong to one team
users.id > teams.id

// Many-to-One: Comments to Posts
// Many comments belong to one post
comments.postId > posts.id

// Many-to-One: Comments to Users
// Many comments belong to one user
tags.userId > users.id

// Many-to-Many: Posts to Tags (through post_tags)
// Posts can have many tags, tags can belong to many posts
post_tags.postId > posts.id
post_tags.tagId > tags.id

// Alternative entity-level syntax (defaults to id fields):
// users > teams
// This is equivalent to: users.id > teams.id
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
`.trim();

DEFAULT_DSL =`

// ---------- CRM: Comprehensive DSL (Complex) ----------
// Entities, fields, metadata, indices, enums, junctions, and relationships
// Style: same as your example (types, @pk, @fk, @unique, @required, @default)

// ---------- ENUMS ----------

// ---------- USERS, ROLES, PERMISSIONS ----------
users [icon: user, color: teal] {
  id uuid @pk
  username string @unique @required
  email string @unique @required
  fullName string @required
  password_hash string
  locale string @default("en")
  timezone string @default("UTC")
  active boolean @default(true)
  lastLogin timestamp
  profileId uuid @fk
  createdAt timestamp @default(now)
  updatedAt timestamp
  createdBy uuid @fk
  updatedBy uuid @fk
}

profiles {
  id uuid @pk
  userId uuid @fk @unique
  title string
  phone string
  picture string
  bio text
  socials json
}

roles [icon: shield, color: orange] {
  id uuid @pk
  name string @unique @required
  description text
}

permissions [icon: key, color: green] {
  id uuid @pk
  name string @unique @required
  description text
}

user_roles {
  id uuid @pk
  userId uuid @fk @required
  roleId uuid @fk @required
}

role_permissions {
  id uuid @pk
  roleId uuid @fk @required
  permissionId uuid @fk @required
}

// ---------- ORGANIZATIONAL STRUCTURE ----------
teams [icon: users, color: purple] {
  id uuid @pk
  name string @required
  description text
  leadId uuid @fk
  parentTeamId uuid @fk
  createdAt timestamp @default(now)
}

team_members {
  id uuid @pk
  teamId uuid @fk @required
  userId uuid @fk @required
  role string
}

// ---------- ACCOUNT & CONTACTS ----------
accounts [icon: building, color: blue] {
  id uuid @pk
  name string @required
  externalId string @unique
  type account_type @default(customer)
  industry string
  website string
  phone string
  billingAddress json
  shippingAddress json
  ownerId uuid @fk      // user who owns the account
  revenue decimal(15,2)
  employees int
  status string
  createdAt timestamp @default(now)
  updatedAt timestamp
  createdBy uuid @fk
  updatedBy uuid @fk
}

contacts [icon: address-book, color: pink] {
  id uuid @pk
  firstName string @required
  lastName string
  fullName string @default(concat(firstName, " ", lastName))
  email string @index
  phone string
  mobile string
  role contact_role
  title string
  accountId uuid @fk       // many contacts can belong to one account
  ownerId uuid @fk
  preferredContactMethod string
  customFields json
  createdAt timestamp @default(now)
  updatedAt timestamp
}

// Junction table for contacts that are related to multiple accounts (many-to-many)
contacts_accounts {
  id uuid @pk
  contactId uuid @fk @required
  accountId uuid @fk @required
  primary boolean @default(false)
}

// ---------- LEADS & CONVERSION ----------
leads [icon: bullseye, color: red] {
  id uuid @pk
  source string            // e.g., web, trade_show, referral
  campaignId uuid @fk
  ownerId uuid @fk
  firstName string
  lastName string
  company string
  email string @index
  phone string
  status lead_status @default(new)
  score int @default(0)
  assignedAt timestamp
  convertedAccountId uuid @fk   // set when converted
  convertedContactId uuid @fk
  convertedOpportunityId uuid @fk
  createdAt timestamp @default(now)
  updatedAt timestamp
  notes text
}

// ---------- OPPORTUNITIES & PIPELINES ----------
pipelines {
  id uuid @pk
  name string @required
  description text
  stages json   // ordered list of stage objects {name, probability}
  ownerId uuid @fk
  createdAt timestamp @default(now)
}

opportunities [icon: handshake, color: gold] {
  id uuid @pk
  name string @required
  accountId uuid @fk
  primaryContactId uuid @fk
  ownerId uuid @fk
  pipelineId uuid @fk
  stage opportunity_stage @default(prospecting)
  type opportunity_type @default(new_business)
  amount decimal(15,2)
  currency string @default("XAF")
  closeDate date
  probability int
  leadSource string
  expectedRevenue decimal(15,2)
  createdAt timestamp @default(now)
  updatedAt timestamp
  lostReason text
  winNotes text
}

// Many-to-many between opportunities and products
opportunity_products {
  id uuid @pk
  opportunityId uuid @fk @required
  productId uuid @fk @required
  quantity int @default(1)
  unitPrice decimal(15,2)
  lineTotal decimal(15,2)
}

// ---------- PRODUCTS & PRICING ----------
products [icon: box, color: gray] {
  id uuid @pk
  sku string @unique
  name string @required
  description text
  unitPrice decimal(15,2)
  currency string @default("XAF")
  active boolean @default(true)
  weight decimal(10,3)
  dimensions json
  tags json
  createdAt timestamp @default(now)
  updatedAt timestamp
}

// ---------- QUOTES, ORDERS, INVOICES, PAYMENTS ----------
quotes {
  id uuid @pk
  opportunityId uuid @fk
  accountId uuid @fk
  ownerId uuid @fk
  reference string @unique
  status string
  validUntil date
  items json  // [{productId, qty, unitPrice, total}]
  subtotal decimal(15,2)
  taxes decimal(15,2)
  total decimal(15,2)
  createdAt timestamp @default(now)
}

orders {
  id uuid @pk
  quoteId uuid @fk
  accountId uuid @fk
  ownerId uuid @fk
  status string
  orderDate date
  items json
  subtotal decimal(15,2)
  total decimal(15,2)
  createdAt timestamp @default(now)
}

invoices {
  id uuid @pk
  orderId uuid @fk
  accountId uuid @fk
  reference string @unique
  issueDate date
  dueDate date
  status invoice_status @default(draft)
  items json
  subtotal decimal(15,2)
  taxes decimal(15,2)
  total decimal(15,2)
  balanceDue decimal(15,2)
  createdAt timestamp @default(now)
}

payments {
  id uuid @pk
  invoiceId uuid @fk
  accountId uuid @fk
  amount decimal(15,2) @required
  method payment_method
  reference string
  receivedAt timestamp @default(now)
  processedBy uuid @fk
  externalData json   // payment gateway payload
}

// ---------- ACTIVITIES, TASKS & CALENDAR ----------
activities [icon: calendar, color: cyan] {
  id uuid @pk
  subject string @required
  type activity_type @default(task)
  ownerId uuid @fk
  assignedTo uuid @fk
  relatedToType string   // e.g., account, contact, opportunity, case
  relatedToId uuid
  dueDate date
  startAt timestamp
  endAt timestamp
  durationMinutes int
  priority priority @default(medium)
  status string
  details text
  recurrence json   // rrule or recurrence pattern
  createdAt timestamp @default(now)
  updatedAt timestamp
}

// Task / activity assignments history
activity_assignments {
  id uuid @pk
  activityId uuid @fk @required
  fromUserId uuid @fk
  toUserId uuid @fk
  assignedAt timestamp @default(now)
  note text
}

// ---------- CASES / TICKETS / SUPPORT ----------
cases [icon: life-ring, color: red] {
  id uuid @pk
  caseNumber string @unique
  accountId uuid @fk
  contactId uuid @fk
  ownerId uuid @fk
  priority priority @default(medium)
  status string
  subject string
  description text
  resolution text
  closedAt timestamp
  createdAt timestamp @default(now)
  updatedAt timestamp
}

// ---------- CAMPAIGNS & MARKETING ----------
campaigns [icon: megaphone, color: magenta] {
  id uuid @pk
  name string @required
  type string
  startDate date
  endDate date
  budget decimal(15,2)
  ownerId uuid @fk
  channels json   // e.g., ["email","social","ads"]
  metrics json    // e.g., {impressions, clicks, conversions}
  createdAt timestamp @default(now)
}

campaign_members {
  id uuid @pk
  campaignId uuid @fk @required
  contactId uuid @fk
  leadId uuid @fk
  status string
  engagedAt timestamp
}

// ---------- TAGS, NOTES, ATTACHMENTS ----------
tags {
  id uuid @pk
  name string @unique @required
  createdBy uuid @fk
  createdAt timestamp @default(now)
}

entity_tags {
  id uuid @pk
  tagId uuid @fk @required
  entityType string @required   // e.g., "contact","account","opportunity"
  entityId uuid @required
  createdAt timestamp @default(now)
}

notes {
  id uuid @pk
  entityType string @required
  entityId uuid @required
  authorId uuid @fk
  content text @required
  pinned boolean @default(false)
  createdAt timestamp @default(now)
  updatedAt timestamp
}

attachments [icon: paperclip, color: gray] {
  id uuid @pk
  entityType string @required
  entityId uuid @required
  filename string @required
  mimeType string
  size int
  url string @required
  uploadedBy uuid @fk
  uploadedAt timestamp @default(now)
}

// ---------- EMAIL / COMMUNICATION LOGS ----------
emails [icon: envelope, color: indigo] {
  id uuid @pk
  messageId string @unique
  threadId string
  direction string   // inbound / outbound
  from json
  to json
  cc json
  bcc json
  subject string
  body text
  attachments json
  sentAt timestamp
  receivedAt timestamp
  status string
  relatedToType string
  relatedToId uuid
  createdAt timestamp @default(now)
}


// ---------- AUDIT, SECURITY, SETTINGS ----------
audit_logs {
  id uuid @pk
  entityType string
  entityId uuid
  action string       // create, update, delete, login, logout, permission_change
  changes json
  performedBy uuid @fk
  performedAt timestamp @default(now)
  ipAddress string
  userAgent string
}

api_keys {
  id uuid @pk
  key string @unique
  name string
  userId uuid @fk
  scopes json
  lastUsedAt timestamp
  createdAt timestamp @default(now)
  active boolean @default(true)
}


// ---------- SUGGESTED INDEXES (pseudo) ----------

// =====================================================
// RELATIONSHIPS
// Use arrow notation like your example. Comments for clarity.
// =====================================================

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
entity_tags.tagId > tags.id
notes.authorId > users.id
attachments.uploadedBy > users.id

// EMAILS / INTEGRATIONS
emails.relatedToId > accounts.id  // many email.relatedToId relate to different entity types; denote polymorphic

// AUDIT & SECURITY
audit_logs.performedBy > users.id
api_keys.userId > users.id

// MISC
profiles.userId > users.id
accounts.id < opportunities.accountId
contacts.id < notes.entityId   // (polymorphic) note on contact
accounts.id < attachments.entityId

// =====================================================
// EXAMPLES / NOTES:
// - Polymorphic relations: entityType + entityId used for notes, attachments, emails.
// - Use JSON fields where flexible schema is needed (customFields, metrics, entries).
// - Enums define canonical states; extend as needed.
// - Audit logs store change diffs for traceability.
// - Automation rules store triggers/actions as JSON to allow dynamic execution.
// - Price lists and pipeline stages are stored as JSON to allow flexible configuration.
// - Indexes section suggests common composite indexes for performance.
// =====================================================

`.trim();