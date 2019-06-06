import { Request, Response, Router } from "express";
import HttpStatus from "http-status-codes";
import { authorized } from ".";
import { response } from "..";
import { RegisteredBot } from "../../entity";

const router: Router = Router();

router.get("/get", async (req: Request, res: Response) => {
  authorized(req, res)
    .then(async () => {
      let reqData = req.body.data;
      let username = reqData.username;
      let bot = await RegisteredBot.findOne({ username: username });

      if (bot)
        return response(res, {
          status: HttpStatus.OK,
          message: `OK`,
          data: {
            username: bot.username,
            developer: bot.developer,
            token: bot.token
          }
        });
    })
    .catch(err => {
      return response(res, {
        status: HttpStatus.NOT_FOUND,
        message: `Bot not found`,
        data: {
          error: err
        }
      });
    });
});

router.get("/getall", async (req: Request, res: Response) => {
  authorized(req, res)
    .then(async () => {
      let bots = await RegisteredBot.find({
        order: {
          username: "ASC"
        }
      });
      let bot_data = [];

      bots.forEach(bot => {
        bot_data.push({
          id: bot.id,
          username: bot.username,
          developer: bot.developer,
          token: bot.token,
          createdAt: bot.createdAt,
          updatedAt: bot.updatedAt
        });
      });

      return response(res, {
        status: HttpStatus.OK,
        message: `OK`,
        data: {
          bots: bot_data
        }
      });
    })
    .catch(err => {
      return response(res, {
        status: HttpStatus.NOT_FOUND,
        message: `Bot not found`,
        data: {
          error: err
        }
      });
    });
});

router.put("/add", (req: Request, res) => {
  authorized(req, res)
    .then(async () => {
      let reqData = req.body.data;
      let username = reqData.username;
      let developer = reqData.developer;
      let token = reqData.token;
      let bot = await RegisteredBot.findOne({ username: username });

      if (bot)
        return response(res, {
          status: HttpStatus.BAD_REQUEST,
          message: `Bot is already registered; please issue an update instead`,
          data: {
            username: username
          }
        });

      let newBot = new RegisteredBot();
      newBot.username = username;
      newBot.developer = developer;
      newBot.token = token;
      await newBot.save();

      return response(res, {
        status: HttpStatus.OK,
        message: `Successfully created new bot`,
        data: {
          username: username,
          developer: developer
        }
      });
    })
    .catch(err => {
      return response(res, {
        status: HttpStatus.NOT_FOUND,
        message: `Bot not found`,
        data: {
          error: err
        }
      });
    });
});

router.post("/update", (req: Request, res) => {
  authorized(req, res).then(async () => {
    let reqData = req.body.data;
    let reqUsername = reqData.username;
    let reqDeveloper = reqData.developer;
    let reqToken = reqData.token;
    let bot = await RegisteredBot.findOne({ username: reqUsername });
    let username = bot.username;

    let messages = [];
    let data = {};

    if (!bot)
      return response(res, {
        status: HttpStatus.BAD_REQUEST,
        message: `Bot does not exist`,
        data: {
          username: username
        }
      });

    if (reqDeveloper) {
      bot.developer = reqDeveloper;
      messages.push(`Updated developer`);
      data["newDeveloper"] = reqDeveloper;
    }

    if (reqToken) {
      bot.token = reqToken;
      messages.push(`Updated token`);
      data["newToken"] = reqToken;
    }

    bot
      .save()
      .then(() => {
        return response(res, {
          status: HttpStatus.OK,
          message: messages.join(", "),
          data: data
        });
      })
      .catch(err => {
        return response(res, {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Error saving changes to bot`,
          data: {
            username: username,
            error: err
          }
        });
      });
  });
});

router.delete("/delete", (req: Request, res) => {
  authorized(req, res).then(async () => {
    let reqData = req.body.data;
    let username = reqData.username;
    let bot = await RegisteredBot.findOne({ username: username });

    if (!bot)
      return response(res, {
        status: HttpStatus.BAD_REQUEST,
        message: `Bot does not exist`,
        data: {
          username: username
        }
      });

    bot
      .remove()
      .then(() => {
        return response(res, {
          status: HttpStatus.OK,
          message: "Successfully removed bot",
          data: {
            username: username
          }
        });
      })
      .catch(err => {
        return response(res, {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Error removing bot",
          data: {
            username: username,
            error: err
          }
        });
      });
  });
});

export const BotsAdminApi: Router = router;
