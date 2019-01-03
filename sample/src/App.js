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
  createAuthProvider,
  initialCheckForToken,
  createDataProviderPipeline,
  createDataProviderEntity,
  createDataProviderBranch,
  createDataProviderCommit,
} from "../../lib";
import { LoginPage } from "./LoginPage";

initialCheckForToken();

const authProvider = createAuthProvider({
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

const dataProviderEntity = createDataProviderEntity({
  ...baseProviderOptions,
  basePath: resource => `data/${resource}`,
});
const dataProviderPipeline = createDataProviderPipeline({
  ...baseProviderOptions,
});
const dataProviderBranch = createDataProviderBranch({
  ...baseProviderOptions,
});
const dataProviderCommit = createDataProviderCommit({
  ...baseProviderOptions,
});
const dataProvider = (action, resource, params) => {
  if (resource === "pipelines")
    return dataProviderPipeline(action, resource, params);
  if (resource === "branches")
    return dataProviderBranch(action, resource, params);
  if (resource === "commits")
    return dataProviderCommit(action, resource, params);
  else return dataProviderEntity(action, resource, params);
};

const UserFilter = props => (
  <Filter {...props}>
    <TextInput label="Name (exact)" source="name" />
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
    authProvider={authProvider}
    loginPage={LoginPage}
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
    <Resource name="pipelines" list={PipelineList} />
    <Resource name="branches" list={ListGuesser} />
    <Resource name="commits" list={CommitList} />
  </Admin>
);

export default App;
