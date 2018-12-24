import React from "react";
import {
  Admin,
  Resource,
  List,
  Datagrid,
  TextField,
  BooleanField,
  EditButton,
  DeleteButton,
  BulkDeleteButton,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
} from "react-admin";
import {
  authProvider as createAuthProvider,
  dataProvider as createDataProvider,
} from "../../lib";

const resourcePaths = {
  users: "src/data/faq/entry",
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

const UserList = props => (
  <List {...props} bulkActionButtons={<BulkDeleteButton />}>
    <Datagrid rowClick="edit">
      {/* <TextField source="id" /> */}
      <TextField source="title_fr" />
      <TextField source="title_nl" />
      <TextField source="siteProductRange" />
      <TextField source="orderNumber" />
      <BooleanField source="active" />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

const UserEdit = props => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="title_fr" />
      <TextInput source="title_nl" />
      <TextInput source="siteProductRange" />
      <TextInput source="orderNumber" />
      <BooleanInput source="active" />
    </SimpleForm>
  </Edit>
);

const UserCreate = props => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="title_fr" />
      <TextInput source="title_nl" />
      <TextInput source="siteProductRange" />
      <TextInput source="orderNumber" />
      <BooleanInput source="active" />
    </SimpleForm>
  </Create>
);

const App = () => (
  <Admin
    dataProvider={dataProvider}
    authProvider={authProvider}
    loginPage={"div"}
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
