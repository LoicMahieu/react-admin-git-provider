import React from "react";
import {
  Admin,
  Resource,
  List,
  Datagrid,
  TextField,
  BooleanField,
  Filter,
  EditButton,
  DeleteButton,
  BulkDeleteButton,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
  crudUpdateMany,
  ListGuesser,
  DateField,
  ReferenceArrayField,
} from "react-admin";
import { connect } from "react-redux";
import { Button } from "@material-ui/core";
import {
  gitlabAuth,
  createDataProvider,
  GitlabProviderPipeline,
  GitlabProviderFile,
  GitlabProviderFileList,
  GitlabProviderBranch,
  GitlabProviderCommit,
} from "@react-admin-git-provider/gitlab";
import { LocalforageCacheProvider } from "@react-admin-git-provider/common";

gitlabAuth.initialCheckForToken();

const authProvider = gitlabAuth.createAuthProvider({
  baseUrl: process.env.GITLAB_OAUTH_BASE_URL,
  clientId: process.env.GITLAB_OAUTH_CLIENT_ID,
});

const baseProviderOptions = {
  projectId: process.env.GITLAB_PROJECT_ID,
  ref: process.env.GITLAB_REF,
  gitlabOptions: {
    host: process.env.GITLAB_API,
  },
};

const dataProvider = createDataProvider(({ resource }) => {
  if (resource === "pipelines")
    return new GitlabProviderPipeline({
      ...baseProviderOptions,
    });
  if (resource === "branches")
    return new GitlabProviderBranch({
      ...baseProviderOptions,
    });
  if (resource === "commits")
    return new GitlabProviderCommit({
      ...baseProviderOptions,
    });
  if (resource === "articles")
    return new GitlabProviderFile({
      ...baseProviderOptions,
      path: `data/${resource}.json`,
      cacheProvider: new LocalforageCacheProvider({ storeName: "gitlab" }),
    });
  else
    return new GitlabProviderFileList({
      ...baseProviderOptions,
      path: `data/${resource}`,
      cacheProvider: new LocalforageCacheProvider({ storeName: "gitlab" }),
    });
});

const UserFilter = props => (
  <Filter {...props}>
    <TextInput label="Search" source="q" />
  </Filter>
);

const UserBulkActionButtons = props => (
  <>
    <UpdateManyButton {...props} label="Set active" data={{ active: true }} />
    <UpdateManyButton
      {...props}
      label="Set inactive"
      data={{ active: false }}
    />
    <BulkDeleteButton {...props} />
  </>
);

const UpdateManyButton = connect(
  undefined,
  { crudUpdateMany },
)(({ basePath, crudUpdateMany, resource, selectedIds, data, label }) => (
  <Button
    onClick={() => {
      crudUpdateMany(resource, selectedIds, data, basePath);
    }}
  >
    {label}
  </Button>
));

const UserList = props => (
  <List
    {...props}
    bulkActionButtons={<UserBulkActionButtons />}
    filters={<UserFilter />}
  >
    <Datagrid rowClick="edit">
      {/* <TextField source="id" /> */}
      <BooleanField source="active" />
      <TextField source="name" />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

const UserEdit = props => (
  <Edit {...props}>
    <SimpleForm>
      <BooleanInput source="active" />
      <TextInput source="name" />
    </SimpleForm>
  </Edit>
);

const UserCreate = props => (
  <Create {...props}>
    <SimpleForm>
      <BooleanInput source="active" />
      <TextInput source="name" />
    </SimpleForm>
  </Create>
);

const ArticleList = props => (
  <List
    {...props}
    bulkActionButtons={<UserBulkActionButtons />}
    filters={<UserFilter />}
  >
    <Datagrid rowClick="edit">
      {/* <TextField source="id" /> */}
      <BooleanField source="active" />
      <TextField source="title" />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

const ArticleEdit = props => (
  <Edit {...props}>
    <SimpleForm>
      <BooleanInput source="active" />
      <TextInput source="title" />
    </SimpleForm>
  </Edit>
);

const ArticleCreate = props => (
  <Create {...props}>
    <SimpleForm>
      <BooleanInput source="active" />
      <TextInput source="title" />
    </SimpleForm>
  </Create>
);

const PipelineList = props => (
  <List {...props}>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="status" />
      <TextField label="User" source="user.name" />
      {/* <TextField source="sha" />
      <TextField source="ref" />
      <TextField source="webUrl" />
      <TextField source="beforeSha" />
      <BooleanField source="tag" />
      <TextField source="yamlErrors" />
      <NumberField source="user.id" />
      <DateField source="createdAt" />
      <DateField source="updatedAt" />
      <DateField source="startedAt" />
      <DateField source="finishedAt" />
      <TextField source="committedAt" />
      <NumberField source="duration" />
      <TextField source="coverage" /> */}
    </Datagrid>
  </List>
);
export const CommitList = props => (
  <List {...props}>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      {/* <ReferenceField source="shortId" reference="shorts"><TextField source="id" /></ReferenceField> */}
      <TextField source="title" />
      <DateField source="createdAt" />
      {/* <ReferenceArrayField source="parentIds" reference="commits"><TextField source="id" /></ReferenceArrayField> */}
      <TextField source="message" />
      <TextField source="authorName" />
      <TextField source="authorEmail" />
      <DateField source="authoredDate" />
      <TextField source="committerName" />
      <TextField source="committerEmail" />
      <DateField source="committedDate" />
    </Datagrid>
  </List>
);

const App = () => (
  <Admin
    dataProvider={dataProvider}
    authProvider={(type, { username, password } = {}) =>
      authProvider(type, { login: username, password })
    }
  >
    <Resource
      name="users"
      list={UserList}
      edit={UserEdit}
      create={UserCreate}
    />
    <Resource
      name="categories"
      list={UserList}
      edit={UserEdit}
      create={UserCreate}
    />
    <Resource
      name="articles"
      list={ArticleList}
      edit={ArticleEdit}
      create={ArticleCreate}
    />
    <Resource name="pipelines" list={PipelineList} />
    <Resource name="branches" list={ListGuesser} />
    <Resource name="commits" list={CommitList} />
  </Admin>
);

export default App;
