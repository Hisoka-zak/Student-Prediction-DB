const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Course = require('./Models/Course'); 
const Dataset = require('./Models/Dataset'); 
const router = express.Router();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect("mongodb+srv://Admin:1234@cluster0.tz9iw0t.mongodb.net/Academic", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((error) => console.error('MongoDB connection error:', error));

// POST endpoint to add a new course
app.post('/api/addCourse', async (req, res) => {
    const { name, code, assessments } = req.body;

    // Create a new course instance
    const newCourse = new Course({
        name,
        code,
        assessments // Expecting an array of { assessment, mark } objects
    });

    try {
        // Save the course to the database
        await newCourse.save();
        res.status(201).json({ message: 'Course added successfully!', course: newCourse });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT endpoint to update an existing course
app.put('/api/updateCourse/:id', async (req, res) => {
  const { id } = req.params; // Get course ID from the URL
  const { name, code, assessments } = req.body; // Data to update

  try {
      // Find the course by ID and update with new data
      const updatedCourse = await Course.findByIdAndUpdate(
          id,
          { name, code, assessments }, // Fields to update
          { new: true, runValidators: true } // Options: return the updated document and validate
      );

      // If the course wasn't found, return a 404 error
      if (!updatedCourse) {
          return res.status(404).json({ error: 'Course not found' });
      }

      // Respond with success message and updated course data
      res.status(200).json({ message: 'Course updated successfully!', course: updatedCourse });
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
});


// GET endpoint to fetch course names
app.get('/api/courses', async (req, res) => {
  try {
      const courses = await Course.find(); 
      res.status(200).json(courses);
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
});

// DELETE endpoint to delete a course by ID
app.delete('/api/deleteCourse/:id', async (req, res) => {
  const { id } = req.params; // Get course ID from the URL

  try {
    // Find the course by ID and delete it
    const deletedCourse = await Course.findByIdAndDelete(id);

    // If the course wasn't found, return a 404 error
    if (!deletedCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Respond with success message if deletion is successful
    res.status(200).json({ message: 'Course deleted successfully!' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


//API for Extract the assessment names
app.get('/api/courses/assessments/:courseId', async (req, res) => {
  try {
    // Fetch the course by its ID
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Extract the assessment names
    const assessmentNames = course.assessments.map(assessment => assessment.assessment);

    res.json({ assessments: assessmentNames });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch assessments' });
  }
});

app.get('/api/courses/:id', (req, res) => {
  const courseId = req.params.id;
  Course.findById(courseId)
    .then(course => {
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
      res.json(course);
    })
    .catch(err => res.status(500).json({ error: err.message }));
});



// Direct API endpoint to add, update, or concatenate dataset based on course and academicYear
app.put('/api/add-dataset', async (req, res) => {
  try {
    const { course, sem, academicYear, columns, data, replace, concat } = req.body;

    // Check if all required fields are provided
    if (!course || !sem || !academicYear || !columns || !data) {
      const missingFields = [];
      if (!course) missingFields.push('course');
      if (!sem) missingFields.push('sem');
      if (!academicYear) missingFields.push('academicYear');
      if (!columns) missingFields.push('columns');
      if (!data) missingFields.push('data');

      return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    // Normalize semester and academicYear for consistency
    const normalizedSem = sem.trim().toLowerCase();
    const normalizedAcademicYear = academicYear.trim().toLowerCase();

    // Check for an existing dataset with the same course and semester
    const existingDataset = await Dataset.findOne({ course, sem: normalizedSem });

    if (existingDataset) {
      if (existingDataset.academicYear.map(a => a.trim().toLowerCase()).includes(normalizedAcademicYear)) {
        // If the academic year already exists, respond with a conflict
        return res.status(409).json({
          message: `Dataset with course, semester, and academic year (${academicYear}) already exists.`,
        });
      } else {
        if (concat) {
          // Append the new academic year and data
          existingDataset.academicYear.push(academicYear);
          existingDataset.columns = Array.from(new Set([...existingDataset.columns, ...columns]));
          existingDataset.data = [...existingDataset.data, ...data];
          await existingDataset.save();
          return res.json({ message: 'Dataset updated successfully with new academic year and data!' });
        } else {
          return res.status(409).json({
            message: 'Dataset with the same course and semester exists. Confirm replacement or concatenation.',
          });
        }
      }
    } else {
      // Create a new dataset
      const newDataset = new Dataset({
        course,
        sem: normalizedSem,
        academicYear: [academicYear],
        columns,
        data,
      });
      await newDataset.save();
      return res.json({ message: 'Dataset added successfully!' });
    }
  } catch (error) {
    console.error('Error adding, updating, or concatenating dataset:', error.message);
    res.status(500).json({ error: 'Failed to add, update, or concatenate dataset' });
  }
});

// API Endpoint to Get Datasets by Course, Semester, and Academic Year
app.get('/api/datasets/filter', async (req, res) => {
  try {
    const { course, sem, academicYear } = req.query;

    const filter = {};
    if (course) filter.course = course;
    if (sem) filter.sem = sem;
    if (academicYear) filter.academicYear = academicYear;

    const datasets = await Dataset.find(filter).populate('course', 'name');
    res.status(200).json(datasets);
  } catch (error) {
    console.error('Error fetching filtered datasets:', error);
    res.status(500).json({ error: 'Failed to fetch datasets.' });
  }
});


// Start the server
app.listen(8080, () => {
  console.log(`Server running on port 8080..`);
});
