import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { userLogin } from "react-admin";
import { LockOutlined } from "@material-ui/icons";
import { Avatar, Button, CssBaseline, Paper } from "@material-ui/core";
import withStyles from "@material-ui/core/styles/withStyles";

const styles = theme => ({
  main: {
    width: "auto",
    display: "block", // Fix IE 11 issue.
    marginLeft: theme.spacing.unit * 3,
    marginRight: theme.spacing.unit * 3,
    [theme.breakpoints.up(400 + theme.spacing.unit * 3 * 2)]: {
      width: 400,
      marginLeft: "auto",
      marginRight: "auto",
    },
  },
  paper: {
    marginTop: theme.spacing.unit * 8,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: `${theme.spacing.unit * 2}px ${theme.spacing.unit * 3}px ${theme
      .spacing.unit * 3}px`,
  },
  avatar: {
    margin: theme.spacing.unit,
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: "100%", // Fix IE 11 issue.
    marginTop: theme.spacing.unit,
  },
  submit: {
    marginTop: theme.spacing.unit * 3,
  },
});

function SignIn(props) {
  const { classes, userLogin } = props;

  const onSubmit = e => {
    e.preventDefault();
    userLogin();
  };

  return (
    <main className={classes.main}>
      <CssBaseline />
      <Paper className={classes.paper}>
        <Avatar className={classes.avatar}>
          <LockOutlined />
        </Avatar>
        <form className={classes.form} onSubmit={onSubmit}>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
          >
            Log-in
          </Button>
        </form>
      </Paper>
    </main>
  );
}

SignIn.propTypes = {
  classes: PropTypes.object.isRequired,
};

export const LoginPage = connect(
  undefined,
  { userLogin },
)(withStyles(styles)(SignIn));
