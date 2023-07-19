const express = require('express')
const app = express()
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const stripe = require("stripe")(process.env.payment_secreat_key);
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
const cors = require('cors');

app.use(cors())
app.use(express.json())

//vairify jwt setup
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
    // await client.connect();
    const usersCollection = client.db('HouseHunter').collection('users')
    const houseCollection = client.db('HouseHunter').collection('allHouse')
    const bookingCollection = client.db('HouseHunter').collection('allBookings')
    const paymentCollection = client.db('HouseHunter').collection('payments')

    //post jwt
    app.post('/jwt', (req, res) => {
      const user = req.body
      // console.log('user',user);
      const token = jwt.sign(user, process.env.access_token_secreat_key, { expiresIn: '1h' })
      res.send({ token })
    })


    varifyAdminJwt
    const varifyAdminJwt = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' })
      }
      next()
    }

    // database users data hanlde api
    app.get('/users', varifyJwt, async (req, res) => {
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
      // console.log({user});
      const query = { email: user.email }
      // console.log(user,'user');
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // all users data related routes
    app.get('/users/renter/:email', varifyJwt, async (req, res) => {
      const email = req.params.email
      if (req.decoded.email !== email) {
        res.send({ student: false })
      }
      const query = { email: email }
      const student = await usersCollection.findOne(query)
      const result = { student: student?.role === 'user' }
      res.send(result)
    })


    app.get('/users/owner/:email', varifyJwt, async (req, res) => {
      const email = req.params.email
      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const result = { instructor: user?.role === 'instructor' }
      res.send(result)
    })


    app.get('/users/admin/:email', varifyJwt, async (req, res) => {
      const email = req.params.email
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const result = { admin: user?.role === 'admin' }
      res.send(result)
    })


    // database allHouse get data hanlde api
    app.get('/allHouses', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;
        // console.log({limit,page,skip});
        const result = await houseCollection.find({}).limit(limit).skip(skip).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    });

    //count total house
    app.get('/totalHouse', async (req, res) => {
      const totalCount = await houseCollection.countDocuments({});
      // console.log(`Total Count : ${totalCount}`);
      return res.status(200).send({ count: totalCount })
    })

    // select classes part
    app.get('/renterBooking', varifyJwt, async (req, res) => {
      const email = req.query.email
      // console.log(email);
      if (!email) {
        res.send([])
      }
      const decodedEmail = req.decoded.email
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      const query = { email: email }
      const result = await bookingCollection.find(query).toArray()
      console.log(result, 'result');
      res.send(result)
    })


    app.post('/renterBooking', async (req, res) => {
      const item = req.body
      // console.log(item,'item');
      const result = await bookingCollection.insertOne(item)
      res.send(result)
    })

    app.delete('/renterBooking/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
    })


    // summer camp school classes
    app.get('/allClass', async (req, res) => {
      const result = await classesCollection.find({}).toArray()
      res.send(result);
    });

    app.get('/PopularClasses', async (req, res) => {
      const result = await classesCollection.find({ status: 'approved' })
        .sort({ students: -1 })
        .limit(6)
        .toArray();
      res.send(result)
    });

    // allClass get instructor api
    app.get('/instructorClass', varifyJwt, async (req, res) => {
      const email = req.query.email
      // console.log(email);
      if (!email) {
        res.send([])
      }
      const decodedEmail = req.decoded.email
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      const query = { email: email }
      const result = await classesCollection.find(query).toArray()
      // console.log(result,'result');
      res.send(result)
    })

    // get single instructor class data data
    app.get('/allClass/:id', async (req, res) => {
      const id = req.params.id
      // console.log(id);
      const query = { _id: new ObjectId(id) }
      const singleClass = await classesCollection.findOne(query);
      res.send(singleClass)
    })


    //all allClass api new class add
    app.post('/ownerHouses', varifyJwt, async (req, res) => {
      const classData = req.body;
      // console.log(classData,'classData');
      const result = await houseCollection.insertOne(classData);
      res.send(result);
    })




    // instructor class delete api
    app.delete('/ownerHouses/:id', varifyJwt, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await houseCollection.deleteOne(query)
      res.send(result)
    })

    // admin update instructor class status
    app.patch('/ownerHouses/admin/:id', varifyJwt, varifyAdmin, async (req, res) => {
      const id = req.params.id
      // console.log(id);
      const filter = { _id: new ObjectId(id) }
      // console.log(filter);
      const updateDoc = {
        $set: {
          status: 'approved'
        }
      }
      const result = await classesCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // admin update instructor class status
    app.patch('/ownerHouses/adminDenied/:id', varifyJwt, varifyAdmin, async (req, res) => {
      const id = req.params.id
      // console.log(id);
      const filter = { _id: new ObjectId(id) }
      // console.log(filter);
      const updateDoc = {
        $set: {
          status: 'denied'
        }
      }
      const result = await classesCollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    // admin delete instructor classs api
    app.delete('/allHouseAdminDelete/:id', varifyJwt, varifyAdminJwt, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await houseCollection.deleteOne(query)
      res.send(result)
    })


    // create payments intent
    app.post('/payment', varifyJwt, async (req, res) => {
      const { price } = req.body
      const amount = parseInt(price * 100)
      // console.log('price', price, 'amount', amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    // // payment history api
    app.get('/paymentHistory', varifyJwt, async (req, res) => {
      const email = req.query.email
      // console.log(email);
      if (!email) {
        res.send([])
      }
      const decodedEmail = req.decoded.email
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      const query = { email: email }
      const result = await paymentCollection.find(query).sort({ date: -1 }).toArray()
      // console.log(result,'result');
      res.send(result)
    })

    //payment history delete
    app.delete('/payHistory/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await paymentCollection.deleteOne(query)
      res.send(result)
    })





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
  console.log(`HouseHunter Server Is Running On Port:http://localhost:${port}`);
})

