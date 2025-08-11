const express = require('express')
const cors = require('cors')
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const admin = require("firebase-admin");
// Hello

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')

const serviceAccount = JSON.parse(decoded);




// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1gwegko.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});




const verifyFireBaseToken = async (req, res, next) => {
    const authHeader = req.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        console.log('decoded token', decoded);
        req.decoded = decoded;
        next();
    }
    catch (error) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
}
const verifyTokenEmail = (req, res, next) => {
    const emailFromQuery = req.query.email || req.query.creator_email;
    if (emailFromQuery !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
    }
    next();
}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const eventsCollection = client.db("athleticClub").collection("sports");
        const bookingsCollection = client.db("athleticClub").collection("bookings");

        // ✅ 1. Create New Event
        app.post('/events', async (req, res) => {
            const eventData = req.body;
            const result = await eventsCollection.insertOne(eventData);
            res.send(result);
        });
        app.get('/events', verifyFireBaseToken, verifyTokenEmail, async (req, res) => {
            const email = req.query.creator_email;

            const query = { creator_email: email };
            const result = await eventsCollection.find(query).toArray();
            res.send(result);
        });



        app.get('/featured-events', async (req, res) => {
            try {
                const result = await eventsCollection.find()
                    .sort({ _id: -1 })  // _id এর উপরে sort করলে, নতুন entry আগে আসবে
                    .limit(6)
                    .toArray();
                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: 'Failed to fetch featured events' });
            }
        });

        app.get('/sports', async (req, res) => {
            const cursor = eventsCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        app.put('/sports/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updatedEvents = req.body;
            const updatedDoc = {
                $set: updatedEvents
            }
            const result = await eventsCollection.updateOne(filter, updatedDoc, options);
            res.send(result)

        })


        app.delete('/events/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await eventsCollection.deleteOne(query);
            res.send(result);
        });

        app.get('/sports/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await eventsCollection.findOne(query);
            res.send(result)
        });

        app.get('/bookings', verifyFireBaseToken, verifyTokenEmail, async (req, res) => {
            const email = req.query.email;
            // console.log('req header', req.headers);
            const query = {
                user_email: email
            }
            const result = await bookingsCollection.find(query).toArray()
            res.send(result);
        })


        app.post('/bookings', async (req, res) => {
            const bookingData = req.body;
            const result = await bookingsCollection.insertOne(bookingData);
            res.send(result);
        });

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: id };
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        });


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('Athletic Club organize')
})


app.listen(port, () => {
    console.log(`Athletic Club Server is running on port ${port}`)

})