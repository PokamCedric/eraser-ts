/**
 * Default DSL Data
 *
 * Contains the default DSL schema loaded when the application starts.
 */

export const DEFAULT_DSL = `
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
