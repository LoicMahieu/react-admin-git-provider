# react-admin-git-provider

Gitlab data provider for [React Admin](https://marmelab.com/react-admin/).

## Features

* List/edit/remove JSON files
* List pipelines
* List branches
* List commits

## Installation

```sh
npm install react-admin-git-provider

#or
yarn add react-admin-git-provider
```

## Example: `GitlabProviderFileList`

```js
import {
  createDataProvider,
  gitlabAuth,
  GitlabProviderFileList,
} from "@react-admin-git-provider/gitlab";

const authProvider = gitlabAuth.createAuthProvider({
  baseUrl: process.env.GITLAB_OAUTH_BASE_URL,
  clientId: process.env.GITLAB_OAUTH_CLIENT_ID,
});

const dataProvider = createDataProvider(({ resource }) =>
  new GitlabProviderFileList({
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
