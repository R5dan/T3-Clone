import { app } from "../../github/setup";

export const info = {
  name: "Github Info",
  description: "Get information about a github repository",
  execute: async ({owner, repo}) => {
    return app.octokit.rest.repos.get({
      owner,
      repo
    })
  },
}