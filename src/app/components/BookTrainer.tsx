import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, Star, Calendar, Clock, DollarSign, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

export function BookTrainer() {
  const navigate = useNavigate();
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    date: '',
    time: '',
    duration: '60',
    notes: ''
  });

  const trainers = [
    {
      id: 1,
      name: 'Sarah Johnson',
      specialty: 'Strength Training',
      rating: 4.9,
      reviews: 127,
      experience: '8 years',
      rate: '$80/hour',
      image: '👩‍🦰',
      bio: 'Certified strength and conditioning specialist with expertise in Olympic lifting and functional training.',
      certifications: ['NSCA-CSCS', 'USA Weightlifting L1', 'Precision Nutrition L1']
    },
    {
      id: 2,
      name: 'Mike Chen',
      specialty: 'Bodybuilding',
      rating: 4.8,
      reviews: 93,
      experience: '6 years',
      rate: '$70/hour',
      image: '👨',
      bio: 'Competitive bodybuilder turned coach. Specializes in hypertrophy training and competition prep.',
      certifications: ['ISSA-CPT', 'ISSA-Bodybuilding', 'ACE']
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      specialty: 'CrossFit & HIIT',
      rating: 5.0,
      reviews: 156,
      experience: '10 years',
      rate: '$90/hour',
      image: '👩',
      bio: 'Former CrossFit Games competitor. Expert in high-intensity functional movements and metabolic conditioning.',
      certifications: ['CF-L3', 'NSCA-CPT', 'FMS']
    },
    {
      id: 4,
      name: 'David Thompson',
      specialty: 'Rehabilitation',
      rating: 4.9,
      reviews: 84,
      experience: '12 years',
      rate: '$95/hour',
      image: '👨‍⚕️',
      bio: 'Physical therapist and corrective exercise specialist. Perfect for injury recovery and prevention.',
      certifications: ['DPT', 'CSCS', 'FMS', 'SFMA']
    },
    {
      id: 5,
      name: 'Lisa Park',
      specialty: 'Yoga & Mobility',
      rating: 4.7,
      reviews: 68,
      experience: '5 years',
      rate: '$65/hour',
      image: '👩‍🦱',
      bio: 'Registered yoga teacher specializing in athletic mobility and flexibility training.',
      certifications: ['RYT-500', 'FRC', 'Precision Nutrition L1']
    },
    {
      id: 6,
      name: 'James Wilson',
      specialty: 'Sports Performance',
      rating: 4.8,
      reviews: 102,
      experience: '9 years',
      rate: '$85/hour',
      image: '👨‍🦲',
      bio: 'Works with professional athletes. Expert in speed, agility, and sport-specific training.',
      certifications: ['CSCS', 'USATF', 'PES']
    }
  ];

  const handleBook = (trainer: any) => {
    setSelectedTrainer(trainer);
    setShowBooking(true);
  };

  const handleSubmitBooking = () => {
    toast.success(`Booking request sent to ${selectedTrainer.name}!`);
    setShowBooking(false);
    setBookingDetails({ date: '', time: '', duration: '60', notes: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl">Book a Personal Trainer</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <h2 className="text-2xl mb-2">Work with Certified Professionals</h2>
            <p className="text-gray-600">
              Get personalized guidance from experienced trainers. All our trainers are certified and background-checked.
            </p>
          </CardContent>
        </Card>

        {/* Trainers Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainers.map((trainer) => (
            <Card key={trainer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-6xl">{trainer.image}</div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{trainer.rating}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {trainer.reviews} reviews
                    </div>
                  </div>
                </div>
                <CardTitle className="text-xl">{trainer.name}</CardTitle>
                <CardDescription>{trainer.specialty}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{trainer.experience} experience</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span>{trainer.rate}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {trainer.bio}
                </p>

                <div className="flex flex-wrap gap-1 mb-4">
                  {trainer.certifications.slice(0, 2).map((cert) => (
                    <Badge key={cert} variant="secondary" className="text-xs">
                      {cert}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleBook(trainer)}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Session
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTrainer(trainer)}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book Session with {selectedTrainer?.name}</DialogTitle>
            <DialogDescription>
              {selectedTrainer?.specialty} • {selectedTrainer?.rate}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="date">Preferred Date</Label>
              <Input
                id="date"
                type="date"
                value={bookingDetails.date}
                onChange={(e) => setBookingDetails({ ...bookingDetails, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label htmlFor="time">Preferred Time</Label>
              <Select
                value={bookingDetails.time}
                onValueChange={(value) => setBookingDetails({ ...bookingDetails, time: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 14 }, (_, i) => i + 6).map((hour) => (
                    <SelectItem key={hour} value={`${hour}:00`}>
                      {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Session Duration</Label>
              <Select
                value={bookingDetails.duration}
                onValueChange={(value) => setBookingDetails({ ...bookingDetails, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes / Goals (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Tell the trainer about your fitness goals or any specific areas you'd like to focus on..."
                value={bookingDetails.notes}
                onChange={(e) => setBookingDetails({ ...bookingDetails, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span>Session Fee:</span>
                <span>{selectedTrainer?.rate}</span>
              </div>
              <div className="text-xs text-gray-500">
                Trainer will confirm availability within 24 hours
              </div>
            </div>

            <Button className="w-full" onClick={handleSubmitBooking}>
              Send Booking Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trainer Details Dialog */}
      <Dialog open={!!selectedTrainer && !showBooking} onOpenChange={() => setSelectedTrainer(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="text-5xl">{selectedTrainer?.image}</div>
              <div>
                <DialogTitle>{selectedTrainer?.name}</DialogTitle>
                <DialogDescription>{selectedTrainer?.specialty}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-lg">{selectedTrainer?.rating}</span>
              </div>
              <div className="text-sm text-gray-500">
                {selectedTrainer?.reviews} reviews
              </div>
              <div className="text-sm text-gray-500">
                {selectedTrainer?.experience}
              </div>
            </div>

            <div>
              <h4 className="mb-2">About</h4>
              <p className="text-sm text-gray-600">{selectedTrainer?.bio}</p>
            </div>

            <div>
              <h4 className="mb-2">Certifications</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTrainer?.certifications.map((cert: string) => (
                  <Badge key={cert} variant="secondary">
                    {cert}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span>Hourly Rate:</span>
                <span className="text-xl">{selectedTrainer?.rate}</span>
              </div>
            </div>

            <Button className="w-full" onClick={() => handleBook(selectedTrainer)}>
              <Calendar className="w-4 h-4 mr-2" />
              Book a Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
