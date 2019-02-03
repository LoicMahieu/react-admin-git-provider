# react-admin-git-provider

Gitlab data provider for [React Admin](https://marmelab.com/react-admin/).

## Features

* List/edit/remove JSON files (`entity`)
* List pipelines
* List branches
* List commits

## Installation

```sh
npm install react-admin-git-provider

#or
yarn add react-admin-git-provider
```

## Example: `entity`

```js
import {
  createDataProvider,
  gitlabAuth,
  GitlabProviderEntity,
} from "react-admin-git-provider";

const authProvider = gitlabAuth.createAuthProvider({
  baseUrl: process.env.GITLAB_OAUTH_BASE_URL,
  clientId: process.env.GITLAB_OAUTH_CLIENT_ID,
});

const dataProvider = createDataProvider(({ resource }) =>
  new GitlabProviderEntity({
    ...baseProviderOptions,
    basePath: `data/${resource}`,
  })
)

<Admin
  authProvider={authProvider}
  dataProvider={dataProvider}
>
  <Resource
    name="users"
    list={UserList}
    edit={UserEdit}
    create={UserCreate}
  />
</Admin>
```
