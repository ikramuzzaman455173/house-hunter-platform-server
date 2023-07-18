const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
// const stripe = require("stripe")(process.env.payment_secreat_key);
// const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
const cors = require('cors');

app.use(cors())
app.use(express.json())

//varify jwt
const varifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }
  //bearer token
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.access_token_secreat_key, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded
    next()
  })
}

const uri = `mongodb+srv://${process.env.dbuser}:${process.env.dbPass}@cluster0.izhktyr.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection = client.db('HouseHunter').collection('users')

    //post jwt
    app.post('/jwt', (req, res) => {
      const user = req.body
      // console.log('user',user);
      const token = jwt.sign(user, process.env.access_token_secreat_key, { expiresIn: '1h' })
      res.send({ token })
    })

    // varifyAdminJwt
    const varifyAdminJwt = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      if (user?.role !== 'admin') {
        return res.status(403).send({error:true,message:'forbidden message'})
      }
      next()
    }

      // database users data hanlde api
    app.get('/users', varifyJwt, varifyAdmin, async (req, res) => {
      const users = await usersCollection.find({}).toArray()
      res.send(users)
    })

    // database users data hanlde api
    app.get('/allUsers', async (req, res) => {
      const users = await usersCollection.find({}).toArray()
      res.send(users)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      // console.log(user,'user');
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete('/users/:id', varifyJwt, varifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })











      // create payments intent
      // app.post('/payment',varifyJwt,async (req,res) => {
      //   const { price } = req.body
      //   const amount = parseInt(price * 100)
      //   console.log('price',price,'amount',amount);
      //   const paymentIntent = await stripe.paymentIntents.create({
      //     amount: amount,
      //     currency: 'usd',
      //     payment_method_types:['card']
      //   })
      //   res.send({
      //     clientSecret:paymentIntent.client_secret
      //   })
      // })







    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('<h1 style="color:#333;text-align:center;font-size:20px;margin:10px 0;">HouseHunter Server Is Running !!!</h1>')
})

app.listen(port, () => {
  console.log(`The Server Is Running On Port: ${port}`)
})

