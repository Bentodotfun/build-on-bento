import { TwitterApi } from 'twitter-api-v2';

const twitterClient = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

const readWriteClient = twitterClient.readWrite;

export async function getTweet(tweetId) {
  try {
    const tweet = await readWriteClient.v2.singleTweet(tweetId, {
      'tweet.fields': ['author_id', 'text', 'public_metrics'],
      'expansions': ['author_id'],
      'user.fields': ['username', 'name']
    });

    const author = tweet.includes?.users?.[0];

    return {
      text: tweet.data.text,
      authorHandle: author?.username || 'unknown',
      metrics: tweet.data.public_metrics
    };
  } catch (error) {
    console.error('Error fetching tweet:', error);
    throw new Error(`Failed to fetch tweet: ${error.message}`);
  }
}

export async function postReply(tweetId, text) {
  try {
    const reply = await readWriteClient.v2.reply(text, tweetId);
    return { replyId: reply.data.id };
  } catch (error) {
    console.error('Error posting reply:', error);
    return { replyId: null, error: error.message };
  }
}

export async function postQuoteTweet(tweetId, text) {
  try {
    const quote = await readWriteClient.v2.quote(text, tweetId);
    return { tweetId: quote.data.id };
  } catch (error) {
    console.error('Error posting quote tweet:', error);
    throw new Error(`Failed to post quote tweet: ${error.message}`);
  }
}
