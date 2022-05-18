
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


    app.get('/services', async(req , res )=>{
      const query = {};
        const cursor =  servicesCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    })
    // get booking 
    app.get('/available', async(req , res)=>{
      const date = req.query.date || 'May 17, 2022';
      // step 1 : get all the services
      const services = await servicesCollection.find().toArray();
      // step 2 : get all booking of the day 
      const query = {date : date};
      const booking = await bookingCollection.find(query).toArray();
      // step 3 : for each service find booking for that service
      services.forEach(service=>{
        const serviceBooking = booking.filter(b=>b.treatment === service.name);
        const booked = serviceBooking.map(s => s.slot);
        const available = service.slots.filter(s=>!booked.includes(s));
        service.available = available;
        
      })
      res.send(services);
    })

    // for booking 
    app.post('/booking', async (req , res)=>{
      const booking = req.body;
      const query = {treatment:booking.treatment , date:booking.date, patient:booking.patient  }
      const cursor = await bookingCollection.findOne(query);
      if(cursor){
        return res.send({success:false,booking:cursor});
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({success:true,result});
    })
    // 
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`localhost ${port}`) 
})