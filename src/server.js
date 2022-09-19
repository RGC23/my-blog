import express from 'express';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import path from 'path';

const app = express();

app.use(express.static(path.join(__dirname, '/build')));
app.use(bodyParser.json());

const withDB = async (operations, res) => {
    try {
        // Connects to the mongodb database
        const client = await MongoClient.connect('mongodb://0.0.0.0:27017', { useNewUrlParser: true });
        const db = client.db('my-blog');
        // The database connection is passed into the function containing the operations,
        // the parameter "operations" represents this function.
        await operations(db);
        // Closes the database
        client.close();
    } catch (error) {
        res.status(500).json({ message: 'Error connecting to db', error });
    }
};

app.get('/api/articles/:name', async (req, res) => {
        // An arrow function is passed into the withDB() function containing the operations on the data,
        // this is executed once the database connection has been made.
        withDB(async (db) => {
            const articleName = req.params.name;
            const articleInfo = await db.collection('articles').findOne({ name: articleName })
            res.status(200).json(articleInfo);
        }, res)
});

app.post('/api/articles/:name/upvote', async (req, res) => {
    withDB(async (db) => {
        const articleName = req.params.name;
        // Upvote count is updated in the database
        const articleInfo = await db.collection('articles').findOne({name: articleName});
        await db.collection('articles').updateOne({name: articleName}, 
            {$set: {upvotes: articleInfo.upvotes + 1,}});
        // Updated info on that specific article is sent as a response
        const updatedArticleInfo = await db.collection('articles').findOne({name: articleName});
        res.status(200).json(updatedArticleInfo);
    }, res);
});

app.post('/api/articles/:name/add-comment', (req, res) => {
    withDB(async (db) => {
        const { username, text } = req.body;
        const articleName = req.params.name;
        const articleInfo = await db.collection('articles').findOne({name: articleName});
        await db.collection('articles').updateOne({name: articleName},
            {$set: {comments: articleInfo.comments.concat({username, text})}})
        const updatedArticleInfo = await db.collection('articles').findOne({name: articleName});
        res.status(200).json(updatedArticleInfo);
    }, res);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/build/index.html'));
});

app.listen(8000, () => console.log('Listening on port 8000'));