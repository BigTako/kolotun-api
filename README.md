# _Kolotun memes forum API_

## _Laugh,create,repeat!_

[Postman collection for testing API](https://documenter.getpostman.com/view/27994867/2s9Ykke2Xr)

- #### Techology Stack

  [![BackEnd](https://skillicons.dev/icons?i=nodejs,express,mongodb)](https://skillicons.dev)

  _And also JWT for authorization, Nodemailer and Postman for testing API._

The project which allows to overview and create memes using pleasant WEB UI.

# What is it?

> Simple web API built with NodeJs,Express and MongoDB which provides convenient interface for
> oveview and creating memes(posts). Nice features are reactions to memes, ability to comment and create
> own account for storing favorite posts.

# How to run:

> To run API , firstly clone my repository with API using `git clone https://github.com/BigTako/kolotun-api.git`.
> Then run command `npm install` in cloned project root directory to install all necessary packages.
> Next step, is to congirure database. My solution is using MongoDB, so you can create you own cluster
> in Atlas `https://www.mongodb.com/cloud/atlas/register` or crete in localy using Compass `https://www.mongodb.com/products/tools/compass`.
> When it's done, create a `config.env` file in project root directory which will look like this:
> (or a little bit different if you're using local db)

- PORT=3000(port on which server is running, you can specify your own)
- DATABASE=(url to your db, i user url provided by Atlas)
- DATABASE_PASSWORD=(password to your db)
- NODE_ENV="development" (app running mode, 'development' by default, 'production' when deploing)
- JWT_SECRET=(create a secret key string 32+symbols)
- JWT_EXPIRES_IN=90d(specify your own expiration time or leave by default)
- JWT_COOKIE_EXPIRES_IN=90
- EMAIL_USERNAME=(specify email sender here)
- EMAIL_PASSWORD=(gmail passkey here)
- EMAIL_SERVICE=gmail(by default)
- EMAIL_FROM=(your company)

# Endpoints:

> [Auth Module](#Auth-Module)
>
> [Memes Module](#Memes-Module)
>
> [User Module](#User-Module)
>
> [Comments Module](#Comments-Module)

## Query filtering and sorting

> Some routes of API support special feature `quering`.That means that you can controll count and view of documents route returns.

- example: `http://127.0.0.1:3000/api/v1/memes/?fields=slug,likesCount&sort=-likesCount&limit=3&page=1`

Here:

- fields = use `fields` parameter to select only defined fields in each of returned documents.
- sort - use `sort` parameter to sort by any field of Post model `sort=field`. Order of sorting is regulated by `-` at the beginning of `field` what means `reversed`.
- limit - use `limit` parameter to limit the number of posts to be returned.
- page - use `page` to divide returned docs into groups(size of group defined by `limit`).
- Any other fields will be considered as 'filters' , you can user them by passing `field[operator]=value`.
- Operators are:
- `[gt]` - greater than value(Number fields)
- `[lt]` - less than value(Number fields)
- `[gte]` - greater that or equal to value(Number fields)
- `[lte]` - less than or equal to value(Number fields)
- nothing means `equals`, example `field=value`

# Auth Module

### Sign Up

POST`http://127.0.0.1:3000/api/v1/users/signup`

Body parameters:

- name `string`
- pseudo `unique string`
- email `enique string`
- password `string`
- passwordConfirm `string`

### Login

POST`http://127.0.0.1:3000/api/users/login`

Body parameters:

- email `enique string`
- password `string`

### Logout

POST`http://127.0.0.1:3000/api/v1/users/logout`

Logout from current session

### Send Password Reset

POST`http://127.0.0.1:3000/api/v1/users/forgotPassword`

Body parameters:

- email - which account is signed up on(link will be sent there)

### Password Reset Confirm

PATCH`http://127.0.0.1:3000/api/v1/users/resetPassword/:token`

Body parameters:

- password `string`
- passwordConfirm `string`

Rest password to new one

# User Module

### Get All Users (supports quering)

GET `http://127.0.0.1:3000/api/v1/users`
**This feature only for users with admin role**

### Get User by id

GET `http://127.0.0.1:3000/api/v1/users/:id`
**This feature only for users with admin role**

Where id is user_id

### Create user

POST `http://127.0.0.1:3000/api/v1/users/:id`
**This feature only for users with admin role**

Where id is user_id

Body parameters:

- avatar `file`
- name `string`
- role `string` (user|admin)
- pseudo `unique string`
- email `enique string`
- password `string`
- passwordConfirm `string`
- active `boolean`
- activated `boolean`

### Update user

PATCH `http://127.0.0.1:3000/api/v1/users/:id`
**This feature only for users with admin role**

Where id is user_id

Body parameters(all are optional):

- avatar `file`
- name `string`
- role `string` (user|admin)
- pseudo `unique string`
- email `enique string`
- password `string`
- passwordConfirm `string`
- active `boolean`
- activated `boolean`

### Delete user(hard delete)

DELETE `http://127.0.0.1:3000/api/v1/users/:id`
**This feature only for users with admin role**

Where id is user_id

### Get current user(logged in)

GET `http://127.0.0.1:3000/api/v1/users/me`

### Get current user liked memes

GET `http://127.0.0.1:3000/api/v1/memes/me/liked`

### Update current user(logged in)

PATCH `http://127.0.0.1:3000/api/v1/users/me`

Body parameters(all are optional):

- avatar `file`
- name `string`
- pseudo `unique string`
- email `enique string`

### Update current user passoword (logged in)

PATCH `http://127.0.0.1:3000/api/v1/users/me/updatePassword`

Body parameters:

- passwordCurrent `string`
- password `string`
- passwordConfirm `string`

### Delete current user (soft delete)

DELETE `http://127.0.0.1:3000/api/v1/users/me`

# Memes Module

### Get All Memes (supports quering)

GET `http://127.0.0.1:3000/api/v1/memes`
**This route is public**

### Get meme by id

GET `http://127.0.0.1:3000/api/v1/memes/:id`

where id is meme_id

### Create meme

POST `http://127.0.0.1:3000/api/v1/memes`

Body parameters:

- name `string`
- category `string`
- tags `string[]`
- images `files[]`
- origin `string`
- description `string`

### Update meme

PATCH `http://127.0.0.1:3000/api/v1/memes/:id`

where id is meme_id

Body parameters(all are optional):

- name `string`
- category `string`
- tags `string[]`
- images `files[]`
- origin `string`
- description `string`

### Delete meme (hard delete)

DELETE `http://127.0.0.1:3000/api/v1/memes/:id`

where id is meme_id

### Get top 5 trending memes

GET `http://127.0.0.1:3000/api/v1/memes/top-trending`

### Get memes count

GET `http://127.0.0.1:3000/api/v1/memes/count`

### Like meme

POST `http://127.0.0.1:3000/api/v1/memes/:id/like`

where id is meme_id

> Remember, to delete like, just create it twice!

# Comments Module

### Get meme comments

GET `http://127.0.0.1:3000/api/v1/memes/:id/comments`

where id is meme_id

### Create comment on meme

POST `http://127.0.0.1:3000/api/v1/memes/:id/comments`

where id is meme_id

### Update comment on meme

PATCH `http://127.0.0.1:3000/api/v1/memes/:postId/comments/:commentId`

Body parameters:

- content `string`

### Delete comment on meme (hard delete)

DELETE `http://127.0.0.1:3000/api/v1/memes/:postId/comments/:commentId`

> Made by @BigTako
