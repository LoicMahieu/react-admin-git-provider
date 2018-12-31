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
} from "react-admin";
import { connect } from "react-redux";
import { Button } from "@material-ui/core";
import {
  authProvider as createAuthProvider,
  initialCheckForToken,
  dataProvider as createDataProvider,
} from "../../lib";
import { LoginPage } from "./LoginPage";

initialCheckForToken();

const resourcePaths = {
  users: "data/users",
};

const authProvider = createAuthProvider({
  baseUrl: process.env.GITLAB_OAUTH_BASE_URL,
  clientId: process.env.GITLAB_OAUTH_CLIENT_ID,
});

const dataProvider = (action, resource, params) => {
  const provider = createDataProvider({
    projectId: process.env.GITLAB_PROJECT_ID,
    ref: process.env.GITLAB_REF,
    basePath: resourcePaths[resource],

    gitlabOptions: {
      host: process.env.GITLAB_API,
    },
  });
  return provider(action, resource, params);
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
  </Admin>
);

export default App;
