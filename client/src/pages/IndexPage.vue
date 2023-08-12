<template>
  <q-page class="flex">
    <canvas id="main-chart"></canvas>
  </q-page>
</template>

<script>
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export default {
  name: 'IndexPage',
  mounted() {
    const ctx = document.getElementById('main-chart')
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ["08:00:00", "08:01:00", "08:02:00", "08:03:00", "08:04:00", "08:05:00", "08:06:00", "08:07:00", "08:08:00", "08:09:00", "08:10:00", "08:11:00", "08:12:00", "08:13:00", "08:14:00", "08:15:00", "08:16:00", "08:17:00", "08:18:00", "08:19:00", "08:20:00", "08:21:00", "08:22:00", "08:23:00", "08:24:00", "08:25:00", "08:26:00", "08:27:00", "08:28:00", "08:29:00", "08:30:00"],
        datasets: [{
          label: 'Speed (km/h)',
          backgroundColor: 'rgb(255, 99, 132)',
          borderColor: 'rgb(255, 99, 132)',
          data: [20, 22, 25, 30, 28, 35, 40, 38, 42, 40, 45, 48, 50, 45, 42, 40, 38, 35, 30, 32, 28, 25, 22, 20, 18, 22, 25, 28, 30, 32, 35],
          yAxisID: 'speed',
          pointRadius: 0,
        }, {
          label: 'Steering Angle (deg)',
          backgroundColor: 'rgb(54, 162, 235)',
          borderColor: 'rgb(54, 162, 235)',
          data: [0, 5, -2, 0, 10, 0, -15, 0, 8, 0, -20, 0, 30, 0, -25, 0, 40, 0, -35, 0, 45, 0, 0, 0, 0, 0, 0, 0, 60, 0, -55, 0, 70, 0, -65, 0, 80, 0, -75, 0, 85, 0, -80, 0, 90, 0, -85, 0, 0],
          yAxisID: 'steeringAngle',
          pointRadius: 0,
        }]
      },
      options: {
        // scales: {
        //   xAxis: {
        //     // The axis for this scale is determined from the first letter of the id as `'x'`
        //     // It is recommended to specify `position` and / or `axis` explicitly.
        //     type: 'time',
        //   }
        // }
        scales: {
          speed: {
            type: 'linear',
            display: true,
            position: 'left',
            backgroundColor: 'rgb(255, 99, 132)',
            beginAtZero: true,
          },
          steeringAngle: {
            type: 'linear',
            display: true,
            position: 'left',
            backgroundColor: 'rgb(54, 162, 235)',

            // grid line settings
            grid: {
              drawOnChartArea: false, // only want the grid lines for one axis to show up
            },
          },
        }
      }
    })
  }
}
</script>
