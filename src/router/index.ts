import { createRouter, createWebHistory } from 'vue-router'

import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import AdminDashboard from '@/views/AdminDashboard.vue'
import Students from '@/views/Students.vue'

import ExamView from '@/views/ExamView.vue'
import ResultView from '@/views/ResultView.vue'
import ParentPortal from '@/views/ParentPortal.vue'
import AdminStudents from '@/views/AdminStudents.vue'
import AdminStudentCreate from '@/views/AdminStudentCreate.vue'
import AdminStudentsBatch from '@/views/AdminStudentsBatch.vue'
import AdminExams from '@/views/AdminExams.vue'
import AdminExamCreate from '@/views/AdminExamCreate.vue'
import AdminExamImport from '@/views/AdminExamImport.vue'
import AdminQuestions from '@/views/AdminQuestions.vue'
import AdminQuestionCreate from '@/views/AdminQuestionCreate.vue'
import AdminQuestionEdit from '@/views/AdminQuestionEdit.vue'
import AdminSkills from '@/views/AdminSkills.vue'
import AdminSkillCreate from '@/views/AdminSkillCreate.vue'
import AdminReports from '@/views/AdminReports.vue'
import AdminPayments from '@/views/AdminPayments.vue'
import AdminStaff from '@/views/AdminStaff.vue'
import AdminLevels from '@/views/AdminLevels.vue'
import PublicRegisterWizard from '@/views/PublicRegisterWizard.vue'


const routes = [
  {
    path: '/',
    redirect: '/login' // 👈 ده اللي هيوديه على login
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView
  },
  {
    path: '/register',
    name: 'register',
    component: PublicRegisterWizard
  },
  {
    path: '/parent',
    name: 'parent',
    component: ParentPortal
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminDashboard
  },
  {
    path: '/admin/students',
    name: 'admin.students',
    component: AdminStudents
  },
  {
    path: '/admin/students/create',
    name: 'admin.students.create',
    component: AdminStudentCreate
  },
  {
    path: '/admin/students/batch',
    name: 'admin.students.batch',
    component: AdminStudentsBatch
  },
  {
    path: '/admin/exams',
    name: 'admin.exams',
    component: AdminExams
  },
  {
    path: '/admin/exams/import',
    name: 'admin.exams.import',
    component: AdminExamImport
  },
  {
    path: '/admin/exams/create',
    name: 'admin.exams.create',
    component: AdminExamCreate
  },
  {
    path: '/admin/exams/:id/edit',
    name: 'admin.exams.edit',
    component: AdminExamCreate,
    props: true
  },
  {
    path: '/admin/questions',
    name: 'admin.questions',
    component: AdminQuestions
  },
  {
    path: '/admin/questions/create',
    name: 'admin.questions.create',
    component: AdminQuestionCreate
  },
  {
    path: '/admin/questions/:id/edit',
    name: 'admin.questions.edit',
    component: AdminQuestionEdit,
    props: true
  },
  {
    path: '/admin/skills',
    name: 'admin.skills',
    component: AdminSkills
  },
  {
    path: '/admin/skills/create',
    name: 'admin.skills.create',
    component: AdminSkillCreate
  },
  {
    path: '/admin/skills/:id/levels',
    name: 'admin.levels',
    component: AdminLevels
  },
  {
    path: '/admin/reports',
    name: 'admin.reports',
    component: AdminReports
  },
  {
    path: '/admin/payments',
    name: 'admin.payments',
    component: AdminPayments
  },
  {
    path: '/admin/staff',
    name: 'admin.staff',
    component: AdminStaff
  },
  {
    path: '/exam/:id',
    name: 'exam',
    component: ExamView
  },
  {
    path: '/exam/:id/result',
    name: 'result',
    component: ResultView
  },
  { 
    path: '/students', 
    component: Students 
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router