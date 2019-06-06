import { Request, Router } from "express";
import HttpStatus from "http-status-codes";
import { response } from "..";
import { MirroredVideo, RegisteredBot } from "../../entity";
import {
  CreateMirrorRequest,
  DeleteRequest,
  UpdateRequest
} from "../../structures";

const router: Router = Router();

const SUCCESS_MSG = "a-mirror-bot will update the associated comment shortly.";

/**
 * Checks if the specified request is authorized
 * @param req The request to evaluate

 */
function authorized(req: Request) {
  return new Promise(async (success, fail) => {
    if (
      !req.body ||
      !req.body.auth ||
      !req.body.auth.token ||
      !req.body.auth.botToken
    )
      return fail("Auth parameters not provided");

    let authToken = req.body.auth.token;

    if (process.env.API_TOKEN !== authToken) {
      return fail("Invalid access token");
    }

    let botToken = req.body.auth.botToken;

    let bot = await RegisteredBot.findOne({
      where: {
        token: botToken
      }
    });

    if (bot) return success(bot);

    return fail("Invalid bot access token");
  });
}

async function updateVideo(mirroredVideo: MirroredVideo, url: string) {
  mirroredVideo.url = url;
  await mirroredVideo.save();
}

async function createVideo(data: CreateMirrorRequest) {
  let newMirroredVideo = new MirroredVideo();
  newMirroredVideo.redditPostId = data.redditPostId;
  newMirroredVideo.url = data.url;
  newMirroredVideo.bot = data.bot;
  await newMirroredVideo.save();
}

router.post("/update", async (req, res) => {
  let bot;

  try {
    bot = await authorized(req);
  } catch (err) {
    console.log(err);

    return response(res, {
      status: HttpStatus.UNAUTHORIZED,
      message: err
    });
  }

  let data = req.body.data as UpdateRequest;
  let redditPostId = data.redditPostId;
  let url = data.url;

  let mirroredVideo;

  try {
    mirroredVideo = await MirroredVideo.findOne({
      where: {
        redditPostId: redditPostId,
        bot: bot
      }
    });
  } catch (_err) {
    return response(res, {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: `An error occurred trying to retrieve your mirror's data`
    });
  }

  if (mirroredVideo) {
    try {
      await updateVideo(mirroredVideo, url);
    } catch (_err) {
      return response(res, {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `An error occurred updating your mirror in the database`
      });
    }

    return response(res, {
      status: HttpStatus.OK,
      message: `Successfully updated mirror in database. ${SUCCESS_MSG}`
    });
  } else {
    try {
      createVideo({
        redditPostId: redditPostId,
        url: url,
        bot: bot
      });
    } catch (_err) {
      return response(res, {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `An error occurred creating your mirror in the database`
      });
    }

    return response(res, {
      status: HttpStatus.OK,
      message: `Successfully created mirror in database. ${SUCCESS_MSG}`
    });
    // TODO: how do we notify the cron job?
  }
});

router.delete("/delete", async (req, res) => {
  let bot;

  try {
    bot = await authorized(req);
  } catch (err) {
    return response(res, {
      status: HttpStatus.UNAUTHORIZED,
      message: err
    });
  }

  let data = req.body.data as DeleteRequest;
  let redditPostId = data.redditPostId;
  let url = data.url;

  let mirroredVideo;

  try {
    mirroredVideo = await MirroredVideo.findOne({
      where: {
        redditPostId: redditPostId,
        url: url,
        bot: bot
      }
    });
  } catch (_err) {
    return response(res, {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: `An error occurred trying to retrieve your mirror's data`
    });
  }

  if (mirroredVideo) {
    try {
      mirroredVideo.remove();
    } catch (_err) {
      return response(res, {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `An error occurred trying to remove your mirror`
      });
    }

    return response(res, {
      status: HttpStatus.OK,
      message: `Successfully removed mirror from database. ${SUCCESS_MSG}`
    });
  } else {
    return response(res, {
      status: HttpStatus.NOT_FOUND,
      message: `Mirror not found in database`
    });
  }
});

/* router.post("/reddit/updateposts", (req, res) => {
  // TODO: check for API + CRONTAB authentication
  /*CommentReply.findAll({
    where: {
      status: CommentStatus.AwaitingUpdate
    },
    group: "redditPostId"
  })
    .then(data => {
      // TODO: assemble array based on post ID
      // TODO: loop through array
      // TODO: select all comments based on postId?
      // TODO: generate new reply, send to reddit
    })
    .catch(err => {
      return response(res, {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error updating reddit posts: ${err}`
      });
    });
}); */

export const BotApi: Router = router;