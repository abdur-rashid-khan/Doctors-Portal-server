
const express = require("express");
require('dotenv').config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('DB connected')
})
// verify token 
async function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).send({ messages: 'UnAuthorization' });
  }
  const token = auth.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ messages: 'Forbidden access' })
    }
    req.decoded = decoded;
    next()
  })

}

// Replace the uri string with your MongoDB deployment's connection string.
const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lqf9l.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    await client.connect();
    const servicesCollection = client.db('doctors-portal').collection('services');
    const bookingCollection = client.db('doctors-portal').collection('booking');
    const userCollection = client.db('doctors-portal').collection('user');


    app.get('/services', async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    // services get for name and useing for add doctor specialty
    app.get('/specialty', async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query).project({name:1});
      const result = await cursor.toArray();
      res.send(result);
    })
    // get booking 
    app.get('/available', async (req, res) => {
      const date = req.query.date || 'May 17, 2022';
      // step 1 : get all the services
      const services = await servicesCollection.find().toArray();
      // step 2 : get all booking of the day 
      const query = { date: date };
      const booking = await bookingCollection.find(query).toArray();
      // step 3 : for each service find booking for that service
      services.forEach(service => {
        const serviceBooking = booking.filter(b => b.treatment === service.name);
        const booked = serviceBooking.map(s => s.slot);
        const available = service.slots.filter(s => !booked.includes(s));
        service.available = available;

      })
      res.send(services);
    })
    // for booking 
    app.post('/booking', async (req, res) => {
      const booking = req.body;
      const query = { treatment: booking.treatment, date: booking.date, patientEmail: booking.patientEmail }
      const cursor = await bookingCollection.findOne(query);
      if (cursor) {
        return res.send({ success: false, booking: cursor });
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    })
    // booking 
    app.get('/booking', verifyToken, async (req, res) => {
      // console.log(req.headers.authorization)
      const patientEmail = req.query.patientEmail;
      const decodedEmail = req.decoded.email;
      if (decodedEmail) {
        const query = { patientEmail: patientEmail };
        const booking = await bookingCollection.find(query).toArray();
        return res.send(booking)
      } else {
        return res.status(403).send({ messages: 'Forbidden access' })
      }
    })
    //put user data 
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const option = { upsert: true };
      const updateDos = {
        $set: user,
      }
      const result = await userCollection.updateOne(filter, updateDos, option);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '24h' });
      res.send({ result, token });
    })
    // admin making
    app.put('/user/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester })
      if (requesterAccount.role === 'admin') {
        const filter = { email: email };
        const updateDos = {
          $set: { role: 'admin' },
        }
        const result = await userCollection.updateOne(filter, updateDos);
        res.send(result);
      } else {
        res.status(403).send({ messages: 'forbidden' });
      }
    })
    // admin
    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAmin = user.role === 'admin';
      res.send({ admin: isAmin });
    })
    // total user load
    app.get('/total-user', verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`localhost ${port}`)
})


// this code for checking admin and added admin


// app.put('user/admin/:email', verifyToken, async (req, res) => {
//   const email = req.params.email;
//   const requester = req.decoded.email;
//   const requesterAccount = await userCollection.findOne({ email: requester })
//   if (requesterAccount.role === 'admin') {
//     const filter = { email: email };
//     const updateDos = {
//       $set: { role: 'admin' },
//     }
//     const result = await userCollection.updateOne(filter, updateDos);
//     res.send(result);
//   }else{
//     res.status(403).send({messages:'forbidden'});
//   }
// })
// // admin
// app.get('/admin/:email',async(req , res )=>{
//   const email = req.params.email;
//   const user = await userCollection.findOne({email:email});
//   const isAmin = user.role === 'admin';
//   res.send({admin:isAmin});
// })